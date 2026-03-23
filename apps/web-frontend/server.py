from flask import Flask, send_file
import os
import sys

app = Flask(__name__)

# tmpfs 瓦片目录：QT 写入 /dev/shm/capture-tiles/，前端请求 /img/capture-tiles/...
SHM_CAPTURE_TILES = "/dev/shm/capture-tiles"
# 原图存储根目录，与 QT 端 ImageSaveBasePath 一致，用于直接下载原文件（不复制、不软链接）
IMAGE_SAVE_BASE_PATH = os.environ.get("IMAGE_SAVE_BASE_PATH", "").strip()

@app.route("/<path:path>")
def serve(path):
    try:
        # 开发环境：/img/capture-tiles/ 从 tmpfs 提供
        if path.startswith("img/capture-tiles/"):
            rel = path[len("img/capture-tiles/"):].lstrip("/")
            file_path = os.path.join(SHM_CAPTURE_TILES, rel)
        # 直接下载原文件：/img/direct/<folderType>/<relPath> 从 IMAGE_SAVE_BASE_PATH 下流式提供
        elif path.startswith("img/direct/"):
            suffix = path[len("img/direct/"):].lstrip("/")
            parts = suffix.split("/", 1)
            if len(parts) < 2 or not IMAGE_SAVE_BASE_PATH:
                return "Direct download not configured or invalid path", 404
            folder_type, rel_path = parts[0], parts[1]
            base = os.path.normpath(IMAGE_SAVE_BASE_PATH)
            full = os.path.normpath(os.path.join(base, folder_type, rel_path))
            real_base = os.path.realpath(base)
            try:
                real_full = os.path.realpath(full)
            except OSError:
                return f"File not found: {path}", 404
            if not real_full.startswith(real_base + os.sep) and real_full != real_base:
                return "Invalid path", 403
            file_path = real_full
        else:
            file_path = os.path.join(os.getcwd(), path)
        print(f"Attempting to serve: {file_path}")
        if os.path.isfile(file_path):
            resp = send_file(file_path)
            # 禁用缓存：live 会话是覆盖写，同一路径内容会频繁变化
            resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
            return resp
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