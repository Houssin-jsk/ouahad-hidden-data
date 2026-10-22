"""Native Windows UI for the explicitly started local companion."""
import queue
import json
from pathlib import Path
import threading
import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from service import Companion, Runtime, SafeError, Server, exact_origin, PRODUCTION_ORIGIN, APPROVED


PREFERENCES = Path(__file__).resolve().parent / 'preferences.json'


def load_preferences(path=PREFERENCES):
    """Only an explicitly remembered, nonsecret model-folder preference is accepted."""
    try:
        if path.stat().st_size > 8192:
            return None
        value = json.loads(path.read_text(encoding='utf-8'))
        directory = value.get('modelDirectory') if isinstance(value, dict) and set(value) == {'modelDirectory'} else None
        return directory if isinstance(directory, str) and 0 < len(directory) < 4096 else None
    except (OSError, ValueError):
        return None


def save_preferences(directory, remember, path=PREFERENCES):
    """No images, responses, model keys, pairing codes or website tokens are stored."""
    value = {'modelDirectory': str(directory)} if remember and directory is not None else {}
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value), encoding='utf-8')
    temporary.replace(path)


def main():
    root = tk.Tk()
    root.title('Hidden Data AI Companion')
    root.geometry('620x630')
    root.minsize(560, 600)
    root.configure(background='#f5f2eb')
    style = ttk.Style()
    style.theme_use('clam')
    style.configure('TFrame', background='#f5f2eb')
    style.configure('TLabel', background='#f5f2eb', foreground='#22251f', font=('Segoe UI', 11))
    style.configure('TButton', padding=9, font=('Segoe UI', 10))
    canvas = tk.Canvas(root, background='#f5f2eb', highlightthickness=0)
    scrollbar = ttk.Scrollbar(root, orient='vertical', command=canvas.yview)
    canvas.configure(yscrollcommand=scrollbar.set)
    scrollbar.pack(side='right', fill='y')
    canvas.pack(side='left', fill='both', expand=True)
    frame = ttk.Frame(canvas, padding=24)
    canvas_window = canvas.create_window((0, 0), window=frame, anchor='nw')
    frame.bind('<Configure>', lambda event: canvas.configure(scrollregion=canvas.bbox('all')))
    canvas.bind('<Configure>', lambda event: canvas.itemconfigure(canvas_window, width=event.width))
    canvas.bind_all('<MouseWheel>', lambda event: canvas.yview_scroll(-int(event.delta / 120), 'units'))
    ttk.Label(frame, text='HIDDEN DATA / LOCAL AI', font=('Segoe UI', 10, 'bold')).pack(anchor='w')
    ttk.Label(frame, text='A closer look. On your device.', font=('Segoe UI', 21)).pack(anchor='w', pady=(15, 12))
    ttk.Label(frame, text='Qwen3-VL 2B Instruct · Q4_K_M · CPU only').pack(anchor='w')
    if not APPROVED:
        ttk.Label(frame, text='AI observations unavailable: this configuration failed its grounding quality gate. Model import and connection diagnostics remain available.', wraplength=535, foreground='#8d341f').pack(anchor='w', pady=8)
    ttk.Label(frame, wraplength=535, text='Import the exact supported model package (1.93 GB of weights and vision files). No model download, account, telemetry, or startup service. Tested hardware and setup instructions are included in README.md.').pack(anchor='w', pady=12)
    runtime = Runtime()
    app = Companion(runtime)
    try:
        server = Server(app)
    except OSError:
        messagebox.showerror('Companion could not start', 'Local port 18431 is unavailable. Close another companion instance and try again.')
        root.destroy()
        return
    threading.Thread(target=server.serve_forever, daemon=True).start()
    pending = queue.Queue()
    saved_directory = load_preferences()
    remember = tk.BooleanVar(value=bool(saved_directory))
    status = tk.StringVar(value='Model unavailable — import the supported package.')
    ttk.Label(frame, textvariable=status, wraplength=535, font=('Segoe UI', 12, 'bold')).pack(anchor='w', pady=8)
    ttk.Label(frame, text='Local address: http://127.0.0.1:18431').pack(anchor='w')
    ttk.Label(frame, text='Model package folder (paste a local folder path or browse):').pack(anchor='w', pady=(10, 3))
    model_directory = tk.StringVar(value=saved_directory or '')
    model_entry = ttk.Entry(frame, textvariable=model_directory, font=('Segoe UI', 10))
    model_entry.pack(fill='x')
    buttons = ttk.Frame(frame)
    buttons.pack(fill='x', pady=12)

    def work(operation):
        def run():
            try:
                operation()
            except SafeError as error:
                pending.put(error.message)
            except Exception:
                pending.put('The operation failed. Check the supported package and available memory; local paths are not sent to the website.')
        threading.Thread(target=run, daemon=True).start()

    def import_directory(directory):
        if directory:
            model_directory.set(directory)
            remember_directory = remember.get()
            status.set('Verifying every model and runtime file…')
            import_button.state(['disabled'])
            def load():
                try:
                    runtime.import_package(directory)
                    save_preferences(directory, remember_directory)
                finally:
                    pending.put(None)
            work(load)

    def import_model():
        directory = filedialog.askdirectory(title='Select qwen3-vl-2b-instruct package folder')
        import_directory(directory)

    import_button = ttk.Button(buttons, text='Verify folder', command=lambda: import_directory(model_directory.get().strip()))
    import_button.pack(side='left')
    ttk.Button(buttons, text='Browse…', command=import_model).pack(side='left', padx=4)
    ttk.Button(buttons, text='Start model', command=lambda: work(runtime.start)).pack(side='left', padx=8)

    def stop():
        app.disconnect()
        runtime.stop()
        pending.put(('pairing', 'Disconnected. Generate a new code when ready.'))
    ttk.Button(buttons, text='Stop / unload', command=lambda: work(stop)).pack(side='left')

    def remember_changed():
        try:
            save_preferences(runtime.root, remember.get())
        except OSError:
            messagebox.showerror('Preferences unavailable', 'The model-folder preference could not be saved. Import remains available for this session.')
    ttk.Checkbutton(frame, text='Remember model folder after exit (stores its path here)',
        variable=remember, command=remember_changed).pack(anchor='w', pady=4)
    ttk.Separator(frame).pack(fill='x', pady=10)
    ttk.Label(frame, text='Approve your Hidden Data website', font=('Segoe UI', 12, 'bold')).pack(anchor='w')
    ttk.Label(frame, text='Only the official origin below can pair. Preview domains are denied.', wraplength=535).pack(anchor='w', pady=5)
    origin = tk.StringVar(value=PRODUCTION_ORIGIN)
    entry = ttk.Entry(frame, textvariable=origin, font=('Segoe UI', 11))
    entry.state(['readonly'])
    entry.pack(fill='x', pady=5)
    pairing = tk.StringVar(value='No website approved. No images accepted.')

    def pair():
        try:
            trusted = exact_origin(origin.get().strip())
            if runtime.state != 'ready':
                raise SafeError(409, 'Start the model and wait for Ready before pairing.')
            if not messagebox.askyesno('Approve this website?', f'Allow only {trusted} to pair?\n\nEnter the displayed code on that website. Images are sent only when you choose Analyze there. The code expires after 90 seconds; the connection lasts 2 minutes.'):
                return
            code = app.offer_pairing(trusted)
            pairing.set(f'Pairing code: {code}  ·  expires in 90 seconds')
        except (ValueError, SafeError) as error:
            messagebox.showerror('Pairing unavailable', error.message if isinstance(error, SafeError) else str(error))
    ttk.Button(frame, text='Approve website & generate code', command=pair).pack(anchor='w', pady=6)
    ttk.Label(frame, textvariable=pairing, wraplength=535, font=('Segoe UI', 12, 'bold')).pack(anchor='w', pady=6)
    ttk.Label(frame, text='Cancellation unloads the model to guarantee generation stops. Restart it to retry. Only an opted-in model-folder path is saved in app/preferences.json; pairing secrets and images stay in memory. Saved model files are verified again after restart. The model never starts automatically.', wraplength=535).pack(anchor='w', pady=8)

    closing = False
    def close():
        nonlocal closing
        if closing:
            return
        closing = True
        app.disconnect()
        runtime.stop()
        server.shutdown()
        server.server_close()
        root.destroy()
    ttk.Button(frame, text='Exit companion', command=close).pack(anchor='e', pady=8)
    root.protocol('WM_DELETE_WINDOW', close)

    def poll():
        if closing:
            return
        while not pending.empty():
            error = pending.get_nowait()
            import_button.state(['!disabled'])
            if isinstance(error, tuple):
                pairing.set(error[1])
                continue
            if error:
                messagebox.showerror('Companion', error)
        if runtime.process and runtime.process.poll() is not None:
            runtime.stop()
            runtime.state = 'failed'
        states = {'unavailable': 'Model unavailable — import the supported package.',
            'stopped': 'Model available · stopped', 'loading': 'Loading model…',
            'ready': 'Ready · one image at a time', 'busy': 'Analyzing image locally…',
            'failed': 'Failed · check memory and restart the model'}
        if not import_button.instate(['disabled']):
            status.set(states[runtime.state])
        if app.token:
            remaining = max(0, int(app.session_expiry - time.monotonic()))
            pairing.set(f'Connected: {app.session_origin} · {remaining}s remaining' if remaining else 'Pairing session expired. Generate a new code.')
        elif app.code and time.monotonic() >= app.code_expiry:
            pairing.set('Pairing code expired. Generate a new code.')
        root.after(300, poll)

    if saved_directory:
        status.set('Verifying remembered model package…')
        import_button.state(['disabled'])
        def restore():
            try:
                runtime.import_package(saved_directory)
            finally:
                pending.put(None)
        work(restore)
    root.after(300, poll)
    try:
        root.mainloop()
    finally:
        app.disconnect()
        runtime.stop()
        server.server_close()


if __name__ == '__main__':
    main()
