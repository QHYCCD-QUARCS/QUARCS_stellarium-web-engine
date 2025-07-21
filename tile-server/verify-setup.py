#!/usr/bin/env python3
"""
离线地图系统验证脚本
检查瓦片数据完整性和前端配置
"""

import os
import json
import sys

def check_tiles_data():
    """检查瓦片数据完整性"""
    print("🔍 检查瓦片数据...")
    
    tiles_dir = "tiles"
    if not os.path.exists(tiles_dir):
        print("❌ 瓦片目录不存在，请先运行下载脚本")
        return False
    
    # 检查关键瓦片
    critical_tiles = [
        "tiles/0/0/0.png",
        "tiles/1/0/0.png", 
        "tiles/1/1/0.png",
        "tiles/1/0/1.png",
        "tiles/1/1/1.png"
    ]
    
    missing_tiles = []
    for tile in critical_tiles:
        if not os.path.exists(tile):
            missing_tiles.append(tile)
    
    if missing_tiles:
        print(f"❌ 缺少关键瓦片: {missing_tiles}")
        return False
    
    # 统计瓦片数量
    total_tiles = 0
    zoom_levels = []
    
    for zoom in os.listdir(tiles_dir):
        if zoom.isdigit():
            zoom_levels.append(int(zoom))
            zoom_path = os.path.join(tiles_dir, zoom)
            for x in os.listdir(zoom_path):
                x_path = os.path.join(zoom_path, x)
                if os.path.isdir(x_path):
                    total_tiles += len([f for f in os.listdir(x_path) if f.endswith('.png')])
    
    zoom_levels.sort()
    print(f"✅ 瓦片数据检查通过")
    print(f"   - 缩放级别: {min(zoom_levels)}-{max(zoom_levels)}")
    print(f"   - 瓦片总数: {total_tiles:,}")
    
    return True

def check_frontend_config():
    """检查前端配置"""
    print("\n🔍 检查前端配置...")
    
    vue_config_path = "../apps/web-frontend/vue.config.js"
    if not os.path.exists(vue_config_path):
        print("❌ vue.config.js 不存在")
        return False
    
    # 检查配置内容
    with open(vue_config_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    required_configs = [
        "tile-server/tiles",      # 瓦片源路径
        "CopyWebpackPlugin",      # 使用CopyWebpackPlugin
        "from:",                  # 复制源配置
        "to: 'tiles'"            # 目标路径
    ]
    
    missing_configs = []
    for config in required_configs:
        if config not in content:
            missing_configs.append(config)
    
    if missing_configs:
        print(f"❌ 配置文件缺少必要配置: {missing_configs}")
        return False
    
    print("✅ 前端配置检查通过")
    return True

def check_build_tools():
    """检查构建工具"""
    print("\n🔍 检查构建工具...")
    
    makefile_path = "../apps/web-frontend/Makefile"
    if not os.path.exists(makefile_path):
        print("❌ Makefile 不存在")
        return False
    
    with open(makefile_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "build-with-tiles:" not in content:
        print("❌ Makefile 缺少 build-with-tiles 目标")
        return False
    
    print("✅ 构建工具检查通过")
    return True

def check_dist_integration():
    """检查dist目录集成"""
    print("\n🔍 检查dist目录集成...")
    
    dist_tiles_path = "../apps/web-frontend/dist/tiles"
    if os.path.exists(dist_tiles_path):
        print(f"✅ dist/tiles 目录存在")
        
        # 检查一些关键瓦片
        critical_tiles = ["0/0/0.png", "1/0/0.png"]
        existing_tiles = []
        
        for tile in critical_tiles:
            tile_path = os.path.join(dist_tiles_path, tile)
            if os.path.exists(tile_path):
                existing_tiles.append(tile)
        
        if existing_tiles:
            print(f"   - 已复制瓦片: {len(existing_tiles)}/{len(critical_tiles)}")
        else:
            print("⚠️  瓦片未复制到dist目录，需要重新构建")
    else:
        print("⚠️  dist/tiles 目录不存在，需要运行构建")
    
    return True

def generate_usage_guide():
    """生成使用指南"""
    print("\n📖 使用指南:")
    print("1. 下载瓦片数据:")
    print("   cd tile-server && python3 download-tiles.py")
    print()
    print("2. 构建包含离线地图的应用:")
    print("   cd apps/web-frontend && make build-with-tiles")
    print()
    print("3. 启动服务:")
    print("   cd apps/web-frontend && make start")
    print()
    print("4. 访问应用:")
    print("   http://localhost:8080")

def main():
    print("🗺️ 离线地图系统验证工具")
    print("=" * 50)
    
    checks = [
        check_tiles_data,
        check_frontend_config,
        check_build_tools,
        check_dist_integration
    ]
    
    results = []
    for check in checks:
        try:
            result = check()
            results.append(result)
        except Exception as e:
            print(f"❌ 检查过程中出错: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    
    if all(results):
        print("🎉 所有检查通过！离线地图系统配置正确")
        print("可以运行: cd ../apps/web-frontend && make build-with-tiles")
    else:
        print("⚠️  发现问题，请根据上述提示进行修复")
        generate_usage_guide()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 