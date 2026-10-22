"""Exact reference text-quality functions, with a dependency-free content adapter.
Source: OUAHAD AI engine/quality.py. These checks cannot establish visual truth.
"""
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent/'vendor'))
from langdetect import DetectorFactory, LangDetectException, detect_langs
DetectorFactory.seed=0

class VisionContent:
    def __init__(self,value):
        self.value=value
        self.main_visible_objects=value['main_visible_objects']
        self.uncertainties=value['uncertainties']
    def model_dump(self): return self.value

def normalized(value: str) -> str:
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", value).casefold()))

def object_key(value: str) -> str:
    words = normalized(value).split()
    if words and words[0] in {"a", "an", "the"}:
        words.pop(0)
    if words:
        irregular = {"people": "person", "buses": "bus", "children": "child", "shelves": "shelf"}
        tail = words[-1]
        if tail in irregular:
            words[-1] = irregular[tail]
        elif len(tail) > 3 and tail.endswith("s") and not tail.endswith("ss") and tail not in {"news", "species", "series", "lens"}:
            words[-1] = tail[:-1]
    return " ".join(words)

def quality_issues(content: VisionContent) -> list[str]:
    issues = set()
    fields = content.model_dump()
    strings = []
    for name, value in fields.items():
        if isinstance(value, str):
            strings.append((name, value))
        elif isinstance(value, list):
            strings.extend((name, item) for item in value)
            keys = [object_key(item) if name == "main_visible_objects" else normalized(item) for item in value]
            if len(set(keys)) != len(keys):
                issues.add("duplicate_objects" if name == "main_visible_objects" else "duplicate_list_items")
    for name, text in strings:
        if any(unicodedata.category(c).startswith("L") and "LATIN" not in unicodedata.name(c, "") for c in text):
            issues.add("non_latin_letters")
        if any(unicodedata.category(c) in {"Cc", "Cf"} and c not in "\n\r\t" for c in text):
            issues.add("control_characters")
        sentences = [normalized(s) for s in re.split(r"[.!?;\n]+", text)]
        if any(count >= 2 for sentence, count in Counter(s for s in sentences if len(s.split()) >= 6).items()):
            issues.add("repeated_sentences")
        # A bounded long-field n-gram diagnostic also catches loops lacking punctuation.
        words = normalized(text).split()
        if len(words) >= 36:
            grams = Counter(tuple(words[i:i+12]) for i in range(len(words)-11))
            if any(count >= 3 for count in grams.values()):
                issues.add("repeated_passages")
        if name in {"image_description", "scene_and_surroundings"} and len(words) >= 8:
            if words[-1] in {"a", "an", "the", "and", "or", "with", "to", "in", "is", "are", "for", "from", "on", "at", "by", "its", "their"}:
                issues.add("dangling_fragment")
    factual = [value for name, value in strings if name != "uncertainties"]
    # Empty uncertainty is represented by [], never a pretend observation. This
    # narrow list intentionally does not judge whether a specific ambiguity matters.
    empty_uncertainties = {"none", "no uncertainties", "no significant uncertainties", "not applicable", "n a"}
    if any(normalized(item) in empty_uncertainties for item in content.uncertainties):
        issues.add("empty_uncertainty_entry")
    # Only explicit whole-image/whole-scene existential counts are comparable.
    # Different attributes and local/screen/temporal scopes remain distinct. This
    # detects text disagreement, never counts objects in the supplied pixels.
    numbers = {word: number for number, word in enumerate(
        ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"])}
    global_counts = defaultdict(set)
    for text in factual:
        for sentence in re.split(r"[.!?;\n]+", text.casefold()):
            match = re.fullmatch(r"\s*there (?:is|are) (zero|one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2}) (?:visible )?([a-z]+(?: [a-z]+){0,3}) in the (image|scene)\s*", sentence)
            if match:
                count, label, _scope = match.groups()
                # 'image' and 'scene' both explicitly describe the whole frame.
                global_counts[object_key(label)].add(numbers[count] if count in numbers else int(count))
    if any(len(counts) > 1 for counts in global_counts.values()):
        issues.add("explicit_count_contradiction")
    states = defaultdict(set)
    opposite = {frozenset(("open", "closed")), frozenset(("empty", "full")),
                frozenset(("lit", "unlit")), frozenset(("moving", "stationary"))}
    for text in factual:
        for clause in re.split(r"[.!?;,\n]+", text.casefold()):
            match = re.match(r"\s*(?:the |a |an )?([\w'-]+(?: [\w'-]+){0,4}?) (?:is|are) (not )?(open|closed|empty|full|lit|unlit|moving|stationary)\b", clause)
            if match:
                subject, negation, state = match.groups()
                states[object_key(subject)].add((state, not bool(negation)))
    for observations in states.values():
        if any((state, not polarity) in observations for state, polarity in observations):
            issues.add("explicit_contradiction")
        affirmed = {state for state, polarity in observations if polarity}
        if any(pair.issubset(affirmed) for pair in opposite):
            issues.add("explicit_contradiction")
    # Only compare explicit global absence with an identical listed object label.
    # Spatial relations, screen-within-image context and semantic entailment are not solved.
    objects = {object_key(item) for item in content.main_visible_objects}
    for text in factual:
        for sentence in re.split(r"[.!?;\n]+", text.casefold()):
            absence = re.search(r"\bno (?:visible )?([\w -]+?)(?: (?:are|is) (?:visible|present))?(?: in (?:the )?(?:image|scene))?\s*$", sentence)
            if absence and object_key(absence.group(1)) in objects:
                issues.add("explicit_presence_contradiction")
    return sorted(issues)

def validate_reference_quality(value):
    content=VisionContent(value)
    strings=[value['image_description'],*value['main_visible_objects'],*value['notable_visual_details'],*value['uncertainties']]
    if value['scene_and_surroundings']:
        strings.append(value['scene_and_surroundings'])
    try:
        for sample in [' '.join(strings),*[s for s in strings if len(s.split())>=6]]:
            languages=detect_langs(sample)
            if languages[0].lang!='en' or languages[0].prob<.80:
                raise ValueError('non_english_or_uncertain_language')
    except LangDetectException:
        raise ValueError('language_not_established') from None
    issues=quality_issues(content)
    if issues: raise ValueError(','.join(issues))
    return value
