"""Copy the authoritative baseline configuration and exact pure text checks, read-only reference."""
import ast
import hashlib
import json
from pathlib import Path
import shutil
import sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
REF=ROOT.parent/'ouahad-ai/vision_engine'
sys.path.insert(0,str(REF))
from engine.providers import SAFETY_INSTRUCTIONS
from engine.config import load_prompt, load_settings
from engine.schemas import VisionContent
old=json.loads((ROOT/'companion/contract.json').read_text())
settings=load_settings()
contract={'version':'1.1.0','system':SAFETY_INSTRUCTIONS,'instruction':load_prompt().analysis_instructions,
    'schema':VisionContent.model_json_schema(),
    'generation':{'temperature':0,'top_k':20,'top_p':.95,'max_tokens':settings.max_output_tokens,'cache_prompt':False},
    'image':{'maxSide':settings.max_image_side,'transport':'image/png','maxBytes':10485760,'jpegQuality':90},
    'limitations':old['limitations'],
    'provenance':{'profile':'baseline','source':'OUAHAD AI vision_engine final baseline','systemSha256':hashlib.sha256(SAFETY_INSTRUCTIONS.encode()).hexdigest(),
        'instructionSha256':hashlib.sha256(load_prompt().analysis_instructions.encode()).hexdigest(),
        'nativeMapping':'think:false is represented by the existing non-reasoning embedded native template; Ollama renderer parity is not asserted. top_k/top_p from installed parameters. cache_prompt:false remains a privacy constraint. No explicit seed; no repeat-penalty override.'}}
(ROOT/'companion/contract.json').write_text(json.dumps(contract,indent=2),encoding='utf-8')
source=(REF/'engine/quality.py').read_text()
tree=ast.parse(source)
functions=[ast.get_source_segment(source,node) for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in ('normalized','object_key','quality_issues')]
header='''"""Exact reference text-quality functions, with a dependency-free content adapter.
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

'''
footer='''

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
'''
(ROOT/'companion/reference_quality.py').write_text(header+'\n\n'.join(functions)+footer,encoding='utf-8')
vendor=ROOT/'companion/vendor'
vendor.mkdir(exist_ok=True)
packages=REF/'.venv/Lib/site-packages'
shutil.copytree(packages/'langdetect',vendor/'langdetect',dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','tests'))
shutil.copy2(packages/'six.py',vendor/'six.py')
for pattern in ('langdetect-*.dist-info','six-*.dist-info'):
    for directory in packages.glob(pattern):
        shutil.copytree(directory,vendor/directory.name,dirs_exist_ok=True,ignore=shutil.ignore_patterns('RECORD','INSTALLER','REQUESTED','direct_url.json'))
inventory=[]
for file in vendor.rglob('*'):
    if file.is_file():inventory.append({'path':file.relative_to(vendor).as_posix(),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(ROOT/'docs/phase-03/evidence/qwen/resolution/reference-vendor.json').write_text(json.dumps({'reason':'Reuse the exact reference English-language and conservative text checks. Existing pure-Python langdetect1.0.9 and six copied locally; no pip/network installation. Pydantic/FastAPI not added. Notices included.','sourceQualitySha256':hashlib.sha256(source.encode()).hexdigest(),'files':inventory},indent=2))
(ROOT/'companion/promotion.json').write_text(json.dumps({'approved':False,'contractSha256':hashlib.sha256((ROOT/'companion/contract.json').read_bytes()).hexdigest(),'reason':'Reference behavior restored; independent human-reviewed qualification and complete final GUI verification remain required. Diagnostic comparisons still contain unsupported claims.'},indent=2))
print('Restored exact reference prompt/schema/options; vendored existing language/text checks.')
