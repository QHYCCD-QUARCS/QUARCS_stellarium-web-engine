#!/usr/bin/env python3
"""
地图瓦片下载脚本
用于下载指定区域的OpenStreetMap瓦片到本地
"""

import os
import math
import time
import requests
from urllib.parse import urlparse
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import threading
from tqdm import tqdm
import sys

class TileDownloader:
    def __init__(self, base_url="https://tile.openstreetmap.de"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Offline Map Downloader 1.0'
        })
        self.pbar = None
        
        # 添加下载控制参数
        self.max_retries = 3
        self.retry_delay = 1.0
        self.request_timeout = 30
        
        # 测试网络连接
        self.test_connection()
    
    def test_connection(self):
        """测试网络连接"""
        try:
            print("正在测试网络连接...")
            response = self.session.get(f"{self.base_url}/0/0/0.png", timeout=10)
            response.raise_for_status()
            print("网络连接正常")
        except requests.exceptions.RequestException as e:
            print(f"网络连接测试失败: {e}")
            print("请检查网络连接或尝试使用代理")
            sys.exit(1)
    
    def deg2num(self, lat_deg, lon_deg, zoom):
        """将经纬度转换为瓦片坐标"""
        lat_rad = math.radians(lat_deg)
        n = 2.0 ** zoom
        x = int((lon_deg + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return (x, y)
    
    def download_area(self, north, south, east, west, min_zoom=0, max_zoom=10, output_dir="tiles"):
        """下载指定区域的瓦片"""
        print(f"开始下载区域: N{north} S{south} E{east} W{west}")
        print(f"缩放级别: {min_zoom}-{max_zoom}")
        
        self.total_tiles = 0
        self.downloaded_tiles = 0
        self.failed_tiles = 0
        self.skipped_tiles = 0
        
        # 清空失败列表
        error_log = os.path.join(output_dir, 'failed_tiles.txt')
        if os.path.exists(error_log):
            os.remove(error_log)
            
        # 创建任务列表
        tasks = []
        for zoom in range(min_zoom, max_zoom + 1):
            west_x, north_y = self.deg2num(north, west, zoom)
            east_x, south_y = self.deg2num(south, east, zoom)
            min_x, max_x = min(west_x, east_x), max(west_x, east_x)
            min_y, max_y = north_y, south_y
            
            zoom_tiles = (max_x - min_x + 1) * (max_y - min_y + 1)
            self.total_tiles += zoom_tiles
            
            print(f"\n缩放级别 {zoom}: {zoom_tiles} 个瓦片")
            print(f"X范围: {min_x} 到 {max_x}")
            print(f"Y范围: {min_y} 到 {max_y}")
            
            for x in range(min_x, max_x):
                for y in range(min_y, max_y + 1):
                    tasks.append((zoom, x, y))
        
        if not tasks:
            print("错误：没有找到需要下载的瓦片")
            return
            
        print(f"总计需要下载 {self.total_tiles} 个瓦片")
        
        # 创建进度条
        self.pbar = tqdm(total=self.total_tiles, desc="下载进度", unit="tiles")
        
        # 顺序下载所有瓦片
        for zoom, x, y in tasks:
            result = self.download_tile_task(zoom, x, y, output_dir)
            self.update_progress(result)
            # 添加短暂延迟，避免请求过于频繁
        
        # 关闭进度条
        self.pbar.close()
        
        print(f"\n=== 下载完成统计 ===")
        print(f"总瓦片数: {self.total_tiles}")
        print(f"成功下载: {self.downloaded_tiles}")
        print(f"跳过已存在: {self.skipped_tiles}")
        print(f"下载失败: {self.failed_tiles}")
        print(f"成功率: {((self.downloaded_tiles + self.skipped_tiles) / self.total_tiles * 100):.1f}%")
        
        if self.failed_tiles > 0:
            print(f"\n失败的瓦片已记录到: {error_log}")
    
    def download_tile_task(self, z, x, y, output_dir):
        """单个瓦片下载任务"""
        # 检查文件是否已存在
        tile_dir = os.path.join(output_dir, str(z), str(x))
        tile_path = os.path.join(tile_dir, f"{y}.png")
        
        if os.path.exists(tile_path):
            return 'skipped'
        
        # 创建目录结构
        os.makedirs(tile_dir, exist_ok=True)
        
        # 下载瓦片
        url = f"{self.base_url}/{z}/{x}/{y}.png"
        
        for attempt in range(self.max_retries):
            try:
                # 添加随机延迟，避免请求过于频繁
                time.sleep(self.retry_delay + (attempt * 0.5))
                
                response = self.session.get(url, timeout=self.request_timeout)
                response.raise_for_status()
                
                with open(tile_path, 'wb') as f:
                    f.write(response.content)
                
                return 'downloaded'
                
            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # 指数退避
                    continue
                else:
                    # 记录失败
                    error_log = os.path.join(output_dir, 'failed_tiles.txt')
                    with open(error_log, 'a') as f:
                        f.write(f"{z}/{x}/{y}\n")
                    return 'failed'
        
        return 'failed'
    
    def update_progress(self, result):
        """更新下载进度"""
        if result == 'downloaded':
            self.downloaded_tiles += 1
        elif result == 'skipped':
            self.skipped_tiles += 1
        elif result == 'failed':
            self.failed_tiles += 1
        
        # 更新进度条
        self.pbar.update(1)
        self.pbar.set_postfix({
            '已下载': self.downloaded_tiles,
            '已跳过': self.skipped_tiles,
            '失败': self.failed_tiles
        })

def main():
    downloader = TileDownloader()
    
    # 选择下载区域配置
    regions = {
        'beijing_small': {
            'name': '北京小区域',
            'north': 40.2, 'south': 39.8, 'east': 116.6, 'west': 115.8,
            'min_zoom': 0, 'max_zoom': 12
        },
        'beijing_large': {
            'name': '北京大区域',
            'north': 40.5, 'south': 39.5, 'east': 117.0, 'west': 115.5,
            'min_zoom': 0, 'max_zoom': 14
        },
        'china_major_cities': {
            'name': '中国主要城市',
            'north': 50.0, 'south': 20.0, 'east': 135.0, 'west': 75.0,
            'min_zoom': 0, 'max_zoom': 8
        },
        'china_full': {
            'name': '中国全境',
            'north': 53.5, 'south': 18.0, 'east': 135.0, 'west': 73.0,
            'min_zoom': 0, 'max_zoom': 10
        },
        'asia': {
            'name': '亚洲地区',
            'north': 60.0, 'south': 10.0, 'east': 150.0, 'west': 60.0,
            'min_zoom': 0, 'max_zoom': 6
        },
        'world_low': {
            'name': '全球低分辨率',
            'north': 85.0, 'south': -85.0, 'east': 180.0, 'west': -180.0,
            'min_zoom': 0, 'max_zoom': 6
        },
        'world_medium': {
            'name': '全球中等分辨率',
            'north': 85.0, 'south': -85.0, 'east': 180.0, 'west': -180.0,
            'min_zoom': 0, 'max_zoom': 9
        },
        'world_high': {
            'name': '全球高分辨率',
            'north': 85.0, 'south': -85.0, 'east': 180.0, 'west': -180.0,
            'min_zoom': 0, 'max_zoom': 18
        }
    }
    
    print("可用的下载区域:")
    for key, region in regions.items():
        print(f"  {key}: {region['name']}")
        print(f"    范围: N{region['north']} S{region['south']} E{region['east']} W{region['west']}")
        print(f"    级别: {region['min_zoom']}-{region['max_zoom']}")
        
        # 估算瓦片数量
        total_tiles = 0
        for zoom in range(region['min_zoom'], region['max_zoom'] + 1):
            west_x, north_y = downloader.deg2num(region['north'], region['west'], zoom)
            east_x, south_y = downloader.deg2num(region['south'], region['east'], zoom)
            min_x, max_x = min(west_x, east_x), max(west_x, east_x)
            min_y, max_y = north_y, south_y  # 修复：北纬y值更小，南纬y值更大
            zoom_tiles = (max_x - min_x + 1) * (max_y - min_y + 1)
            total_tiles += zoom_tiles
        
        print(f"    预计瓦片数: {total_tiles:,}")
        print(f"    预计大小: ~{total_tiles * 20 / 1024:.1f} MB")
        print()
    
    # 用户选择
    choice = input("请输入要下载的区域 (默认: beijing_small, 输入 'custom' 自定义): ").strip()
    if not choice:
        choice = 'beijing_small'
    
    if choice == 'custom':
        # 自定义区域
        print("\n自定义下载区域:")
        try:
            north = float(input("北纬度 (例如: 40.2): "))
            south = float(input("南纬度 (例如: 39.8): "))
            east = float(input("东经度 (例如: 116.6): "))
            west = float(input("西经度 (例如: 115.8): "))
            min_zoom = int(input("最小缩放级别 (例如: 0): "))
            max_zoom = int(input("最大缩放级别 (例如: 12): "))
            
            # 验证坐标
            if not (-90 <= south <= north <= 90):
                print("错误: 纬度范围无效")
                return
            if not (-180 <= west <= east <= 180):
                print("错误: 经度范围无效")
                return
            if not (0 <= min_zoom <= max_zoom <= 18):
                print("错误: 缩放级别范围无效")
                return
            
            region = {
                'name': '自定义区域',
                'north': north, 'south': south, 'east': east, 'west': west,
                'min_zoom': min_zoom, 'max_zoom': max_zoom
            }
        except ValueError:
            print("错误: 输入格式无效")
            return
    elif choice not in regions:
        print(f"错误: 未知区域 '{choice}'")
        return
    else:
        region = regions[choice]
    
    # 确认下载
    print(f"\n准备下载: {region['name']}")
    print(f"范围: N{region['north']} S{region['south']} E{region['east']} W{region['west']}")
    print(f"级别: {region['min_zoom']}-{region['max_zoom']}")
    
    confirm = input("确认开始下载? (y/N): ").strip().lower()
    if confirm != 'y':
        print("下载已取消")
        return
    
    # 开始下载
    downloader.download_area(
        north=region['north'], 
        south=region['south'], 
        east=region['east'], 
        west=region['west'],
        min_zoom=region['min_zoom'], 
        max_zoom=region['max_zoom'],
        output_dir="tiles"
    )

if __name__ == "__main__":
    main() 