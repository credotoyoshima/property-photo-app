from PIL import Image, ImageDraw
import os

# 512x512アイコンを作成
img = Image.new('RGB', (512, 512), color='#1f2937')
draw = ImageDraw.Draw(img)

# 家のアイコンを描画
house_points = [(256, 120), (160, 200), (160, 360), (200, 360), (200, 280), (312, 280), (312, 360), (352, 360), (352, 200), (256, 120)]
draw.polygon(house_points, fill='white')

# ドアを描画
draw.rectangle([240, 280, 272, 320], fill='#1f2937')

# カメラアイコン
draw.ellipse([340, 110, 420, 190], fill='#3b82f6')
draw.ellipse([360, 130, 400, 170], fill='white')
draw.ellipse([368, 138, 392, 162], fill='#1f2937')

# 地図ピンアイコン
draw.ellipse([120, 350, 180, 410], fill='#ef4444')
draw.ellipse([135, 365, 165, 395], fill='white')

# ファイル保存
output_dir = 'public/icons'
os.makedirs(output_dir, exist_ok=True)

img.save(f'{output_dir}/icon-512x512.png')
print('512x512 icon created')

# 192x192アイコンを作成
img_small = img.resize((192, 192), Image.LANCZOS)
img_small.save(f'{output_dir}/icon-192x192.png')
print('192x192 icon created')

print('Icons created successfully!') 