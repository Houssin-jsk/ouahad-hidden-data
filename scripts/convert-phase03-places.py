import json, hashlib
from pathlib import Path
import torch
from torchvision.models import resnet18
import onnx
root=Path('research/assets/experiments/ai/places')
checkpoint=torch.load(root/'resnet18_places365.pth.tar',map_location='cpu',weights_only=True)
state={k.removeprefix('module.'):v for k,v in checkpoint['state_dict'].items()}
model=resnet18(num_classes=365);model.load_state_dict(state,strict=True);model.eval()
tensor=torch.zeros(1,3,224,224)
with torch.inference_mode(): reference=model(tensor).tolist()[0]
torch.onnx.export(model,tensor,str(root/'model.onnx'),input_names=['pixel_values'],output_names=['logits'],opset_version=17,dynamo=False)
graph=onnx.load(str(root/'model.onnx'));onnx.checker.check_model(graph)
data=(root/'model.onnx').read_bytes()
Path('docs/phase-03/evidence/final/places-conversion.json').write_text(json.dumps({'torch':torch.__version__,'onnx':onnx.__version__,'architecture':'torchvision ResNet18, strict official 365-class state_dict','input':[1,3,224,224],'opset':17,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'referenceInput':'all-zero normalized tensor, [1,3,224,224]','referenceLogits':reference},indent=2))
print(len(data),hashlib.sha256(data).hexdigest())
