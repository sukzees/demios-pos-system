# Create Windows ICO file using ImageMagick or convert PNG to ICO
# This version creates a simpler ICO file that works with rcedit

Add-Type -AssemblyName System.Drawing

$iconPath = "public\icons\icon.ico"
$pngPath = "public\icons\icon-256.png"

# First, create a 256x256 PNG
Write-Host "Creating 256x256 PNG..." -ForegroundColor Cyan

$size = 256
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Enable anti-aliasing
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Fill background with blue color
$graphics.Clear([System.Drawing.Color]::FromArgb(33, 150, 243))

# Calculate font size
$fontSize = [int]($size * 0.35)
$font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)

# Create white brush for text
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

# Center the text
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

# Draw "POS" text
$rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
$graphics.DrawString("POS", $font, $brush, $rect, $format)

# Save as PNG
$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Clean up
$graphics.Dispose()
$font.Dispose()
$brush.Dispose()
$format.Dispose()

Write-Host "PNG created: $pngPath" -ForegroundColor Green

# Now convert PNG to ICO using System.Drawing
# Create multiple sizes from the source
$sizes = @(16, 32, 48, 256)
$bitmaps = @()

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bitmap, 0, 0, $s, $s)
    $g.Dispose()
    $bitmaps += $bmp
}

$bitmap.Dispose()

# Create ICO file manually with proper header
$fs = [System.IO.File]::Create($iconPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICO Header
$bw.Write([UInt16]0)  # Reserved (must be 0)
$bw.Write([UInt16]1)  # Type (1 = ICO)
$bw.Write([UInt16]$bitmaps.Count)  # Number of images

# Calculate data offset
$dataOffset = 6 + ($bitmaps.Count * 16)

# Store PNG data
$pngDataArray = @()
foreach ($bmp in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngDataArray += ,$ms.ToArray()
    $ms.Dispose()
}

# Write directory entries
for ($i = 0; $i -lt $bitmaps.Count; $i++) {
    $bmp = $bitmaps[$i]
    $pngData = $pngDataArray[$i]
    
    # Width and Height (0 means 256)
    $w = if ($bmp.Width -ge 256) { 0 } else { $bmp.Width }
    $h = if ($bmp.Height -ge 256) { 0 } else { $bmp.Height }
    
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)  # Color palette (0 = no palette)
    $bw.Write([byte]0)  # Reserved
    $bw.Write([UInt16]1)  # Color planes
    $bw.Write([UInt16]32)  # Bits per pixel
    $bw.Write([UInt32]$pngData.Length)  # Size of image data
    $bw.Write([UInt32]$dataOffset)  # Offset to image data
    
    $dataOffset += $pngData.Length
}

# Write image data
foreach ($pngData in $pngDataArray) {
    $bw.Write($pngData)
}

# Clean up
$bw.Close()
$fs.Close()

foreach ($bmp in $bitmaps) {
    $bmp.Dispose()
}

Write-Host "`nICO file created successfully!" -ForegroundColor Green
Write-Host "Path: $iconPath" -ForegroundColor Green
Write-Host "Size: $((Get-Item $iconPath).Length) bytes" -ForegroundColor Green

# Verify the file
$bytes = [System.IO.File]::ReadAllBytes($iconPath)
Write-Host "`nICO Header verification:" -ForegroundColor Cyan
Write-Host "  Reserved: $($bytes[0..1])" -ForegroundColor Gray
Write-Host "  Type: $($bytes[2..3])" -ForegroundColor Gray
Write-Host "  Count: $($bytes[4..5])" -ForegroundColor Gray
