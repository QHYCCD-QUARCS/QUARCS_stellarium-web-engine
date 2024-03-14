## This demo will generate the HIPS survery demo image. The demo image has a white 
## border and with a number (Npix#) in the center. You can define the Norder and 


from PIL import Image, ImageDraw, ImageFont
import io
import os

def create_image_with_default_font(number, font_size=50):
    width, height = 512, 512
    img = Image.new('RGB', (width, height), 'black')
    draw = ImageDraw.Draw(img)
    border_width = 1
    try:
        font = ImageFont.truetype("Sarai", font_size)
    except IOError:
        font = ImageFont.load_default()
        
    # Draw the white border
    draw.rectangle([border_width, border_width, width - border_width - 1, height - border_width - 1], outline="white")

    # Prepare the text
    text = str(number)
    # Calculating the center for the text
    text_width, text_height = draw.textsize(text, font=font)
    x = (width - text_width) / 2
    y = (height - text_height) / 2

    # Draw the text
    draw.text((x, y), text, fill="white", font=font)

    # Save to a bytes buffer
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='WEBP')
    img_byte_arr = img_byte_arr.getvalue()

    return img_byte_arr

def save_images_for_Norder(Norder):
    # Calculate the total number of images to generate for this Norder
    num_images = 12 * (4 ** Norder)
    # Create directory if it doesn't exist
    dir_path = f'apps/test-skydata/surveys/milkyway/Norder{Norder}/Dir0'
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

    # Generate and save images
    file_paths = []
    for i in range(num_images):
        img_data = create_image_with_default_font(i % 12)  # Cycle through 0-11 for image numbers
        file_name = f"Npix{i}.webp"
        file_path = os.path.join(dir_path, file_name)
        with open(file_path, "wb") as img_file:
            img_file.write(img_data)
        file_paths.append(file_path)
    
    return file_paths

# Example: Generate and save images for Norder=0, 1, 2
# You can replace the range(3) with any Norder value you want to generate images for
all_file_paths = []
Norder=3
for Norder in range(Norder):
    file_paths = save_images_for_Norder(Norder)
    all_file_paths.extend(file_paths)

all_file_paths
