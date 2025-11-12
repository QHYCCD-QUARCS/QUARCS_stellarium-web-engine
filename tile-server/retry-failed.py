#!/usr/bin/env python3
"""
重试失败瓦片下载脚本
专门用于重新下载之前失败的瓦片
"""

import os
import time
import requests
from download_tiles import TileDownloader

def retry_failed_tiles(failed_file="tiles/failed_tiles.txt", output_dir="tiles"):
    """重新下载失败的瓦片"""
    if not os.path.exists(failed_file):
        print(f"未找到失败瓦片列表: {failed_file}")
        return
    
    downloader = TileDownloader()
    
    # 读取失败列表
    with open(failed_file, 'r') as f:
        failed_tiles = [line.strip() for line in f if line.strip()]
    
    if not failed_tiles:
        print("没有失败的瓦片需要重新下载")
        return
    
    print(f"发现 {len(failed_tiles)} 个失败的瓦片，开始重新下载...")
    
    successful = 0
    still_failed = 0
    
    # 创建新的失败列表
    new_failed_file = os.path.join(output_dir, 'failed_tiles_retry.txt')
    
    for i, tile_coord in enumerate(failed_tiles):
        try:
            z, x, y = tile_coord.split('/')
            z, x, y = int(z), int(x), int(y)
            
            print(f"重试 ({i+1}/{len(failed_tiles)}): {z}/{x}/{y}")
            
            if downloader.download_tile(z, x, y, output_dir, max_retries=5):
                successful += 1
                print(f"✓ 重试成功: {z}/{x}/{y}")
            else:
                still_failed += 1
                # 记录仍然失败的瓦片
                with open(new_failed_file, 'a') as f:
                    f.write(f"{z}/{x}/{y}\n")
                print(f"✗ 重试失败: {z}/{x}/{y}")
            
            # 添加延迟
            time.sleep(0.5)
            
        except ValueError:
            print(f"无效的瓦片坐标格式: {tile_coord}")
            continue
    
    print(f"\n=== 重试完成统计 ===")
    print(f"重试瓦片数: {len(failed_tiles)}")
    print(f"成功: {successful}")
    print(f"仍然失败: {still_failed}")
    print(f"重试成功率: {(successful / len(failed_tiles) * 100):.1f}%")
    
    if still_failed > 0:
        print(f"仍然失败的瓦片记录在: {new_failed_file}")
    else:
        print("所有瓦片重试成功！")
        # 删除原失败列表
        os.remove(failed_file)

if __name__ == "__main__":
    retry_failed_tiles() 