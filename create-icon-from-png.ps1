# Convert existing PNG to ICO file for Windows
Add-Type -AssemblyName System.Drawing

$sourcePng = "public\icons\icon-512x512.png"
$iconPath = "public\icons\icon.ico"

# Check if source PNG exists
if (-not (Test-Path $sourcePng)) {
    Write-Host "Error: Source PNG not found at $sourcePng" -ForegroundColor Red
    exit 1
}

Write-Host "Loading source PNG: $sourcePng" -ForegroundColor Cyan

# Load the source image
$sourceImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePng))

Write-Host "Source image size: $($sourceImage.Width)x$($sourceImage.Height)" -ForegroundColor Gray

# Create multiple sizes for ICO file
$sizes = @(16, 32, 48, 256)
$bitmaps = @()

Write-Host "`nCreating resized versions..." -ForegroundColor Cyan

foreach ($size in $sizes) {
    Write-Host "  Creating ${size}x${size}..." -ForegroundColor Gray
    
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Use high quality scaling
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Draw the resized image
    $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
    $graphics.Dispose()
    
    $bitmaps += $bitmap
}

$sourceImage.Dispose()

Write-Host "`nCreating ICO file..." -ForegroundColor Cyan

# Create ICO file
$fs = [System.IO.File]::Create($iconPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICO Header
$bw.Write([UInt16]0)  # Reserved (must be 0)
$bw.Write([UInt16]1)  # Type (1 = ICO)
$bw.Write([UInt16]$bitmaps.Count)  # Number of images

# Calculate data offset
$dataOffset = 6 + ($bitmaps.Count * 16)

# Convert bitmaps to PNG data
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

Write-Host ""
Write-Host "ICO file created successfully!" -ForegroundColor Green
Write-Host "  Path: $iconPath" -ForegroundColor Green
Write-Host "  Size: $((Get-Item $iconPath).Length) bytes" -ForegroundColor Green
$sizeList = $sizes -join ', '
Write-Host "  Contains: $($sizes.Count) images ($sizeList pixels)" -ForegroundColor Green

# Verify the file
$bytes = [System.IO.File]::ReadAllBytes($iconPath)
Write-Host ""
Write-Host "ICO Header verification:" -ForegroundColor Cyan
Write-Host "  Reserved: $($bytes[0]) $($bytes[1]) (should be 0 0)" -ForegroundColor Gray
Write-Host "  Type: $($bytes[2]) $($bytes[3]) (should be 1 0)" -ForegroundColor Gray
Write-Host "  Count: $($bytes[4]) $($bytes[5]) (should be $($sizes.Count) 0)" -ForegroundColor Gray

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. npm run build" -ForegroundColor White
Write-Host "  2. npx electron-builder --dir" -ForegroundColor White
