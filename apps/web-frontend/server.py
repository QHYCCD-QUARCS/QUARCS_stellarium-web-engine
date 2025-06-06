from flask import Flask, send_file
import os
import sys

app = Flask(__name__)

@app.route("/<path:path>")
def serve(path):
    try:
        file_path = os.path.join(os.getcwd(), path)
        print(f"Attempting to serve: {file_path}")
        if os.path.isfile(file_path):
            return send_file(file_path)
        elif os.path.isdir(file_path):
            return f"Directory listing not allowed: {path}", 403
        else:
            return f"File not found: {path}", 404
    except Exception as e:
        print(f"Error serving {path}: {str(e)}")
        return f"Error: {str(e)}", 500

@app.route("/")
def root():
    try:
        index_path = os.path.join(os.getcwd(), "index.html")
        print(f"Attempting to serve index.html from: {index_path}")
        if os.path.exists(index_path):
            return send_file(index_path)
        else:
            files = os.listdir(".")
            return f"index.html not found. Available files: {files}", 404
    except Exception as e:
        print(f"Error serving index.html: {str(e)}")
        return f"Error: {str(e)}", 500

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    ssl_context = None
    if port == 9090:
        ssl_context = ("../certs/stellarium.crt", "../certs/stellarium.key")
    
    # 打印当前工作目录和文件列表
    print(f"Current working directory: {os.getcwd()}")
    print("Files in current directory:")
    for file in os.listdir("."):
        file_path = os.path.join(".", file)
        print(f"- {file} (exists: {os.path.exists(file_path)}, permissions: {oct(os.stat(file_path).st_mode)[-3:]})")
    
    app.run(host="0.0.0.0", port=port, ssl_context=ssl_context)