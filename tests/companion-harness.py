"""Test-only process IPC. Never shipped inside the companion or website."""
import json
from pathlib import Path
import sys
import threading
sys.path.insert(0, str(Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]/'companion'))
from service import Companion, Runtime, Server, SafeError
runtime = Runtime()
app = Companion(runtime, development=True, observations_enabled='--evaluation' in sys.argv)
server = Server(app)
threading.Thread(target=server.serve_forever, daemon=True).start()
print(json.dumps({'ready':True}), flush=True)
try:
    for line in sys.stdin:
        try:
            value = json.loads(line)
            op = value['op']
            if op == 'pair':
                response = {'code':app.offer_pairing(value['origin'])}
            elif op == 'start':
                if runtime.root is None:
                    runtime.import_package(Path(__file__).resolve().parents[2]/'ouahad-ai/models/qwen3-vl-2b-instruct')
                runtime.start()
                response = {'state':runtime.state, 'loadingSeconds':runtime.loading_seconds, 'pid':runtime.process.pid, 'port':runtime.port}
            elif op == 'status':
                response = {'state':runtime.state, 'pid':runtime.process.pid if runtime.process else None, 'active':app.active_id}
            elif op == 'stop':
                app.disconnect()
                runtime.stop()
                response = {'state':runtime.state}
            elif op == 'exit':
                break
            else:
                raise ValueError('Unknown test operation')
            print(json.dumps(response), flush=True)
        except Exception:
            print(json.dumps({'error':'Test operation failed'}), flush=True)
finally:
    app.disconnect()
    runtime.stop()
    server.shutdown()
    server.server_close()
