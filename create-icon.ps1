# Create a proper Windows ICO file with multiple resolutions
Add-Type -AssemblyName System.Drawing

$iconPath = "public\icons\icon.ico"
$sizes = @(16, 32, 48, 64, 128, 256)

Write-Host "Creating icon with sizes: $($sizes -join ', ')" -ForegroundColor Cyan

# Create bitmaps for each size
$bitmaps = @()
foreach ($size in $sizes) {
    Write-Host "Creating ${size}x${size} bitmap..." -ForegroundColor Gray
    
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Enable anti-aliasing
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Fill background with blue color
    $graphics.Clear([System.Drawing.Color]::FromArgb(33, 150, 243))
    
    # Calculate font size (proportional to icon size)
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
    
    # Clean up
    $graphics.Dispose()
    $font.Dispose()
    $brush.Dispose()
    $format.Dispose()
    
    $bitmaps += $bitmap
}

# Save as ICO file using .NET
$iconStream = [System.IO.File]::Create($iconPath)
$iconWriter = New-Object System.IO.BinaryWriter($iconStream)

# ICO header
$iconWriter.Write([UInt16]0)  # Reserved
$iconWriter.Write([UInt16]1)  # Type (1 = ICO)
$iconWriter.Write([UInt16]$bitmaps.Count)  # Number of images

# Calculate offset for image data
$offset = 6 + (16 * $bitmaps.Count)

# Write directory entries
$imageData = @()
foreach ($bitmap in $bitmaps) {
    # Save bitmap to PNG in memory
    $ms = New-Object System.IO.MemoryStream
    $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngData = $ms.ToArray()
    $ms.Dispose()
    
    # Write directory entry
    $width = if ($bitmap.Width -eq 256) { 0 } else { [byte]$bitmap.Width }
    $height = if ($bitmap.Height -eq 256) { 0 } else { [byte]$bitmap.Height }
    
    $iconWriter.Write([byte]$width)      # Width (0 = 256)
    $iconWriter.Write([byte]$height)     # Height (0 = 256)
    $iconWriter.Write([byte]0)           # Color palette
    $iconWriter.Write([byte]0)           # Reserved
    $iconWriter.Write([UInt16]1)         # Color planes
    $iconWriter.Write([UInt16]32)        # Bits per pixel
    $iconWriter.Write([UInt32]$pngData.Length)  # Size of image data
    $iconWriter.Write([UInt32]$offset)   # Offset to image data
    
    $offset += $pngData.Length
    $imageData += $pngData
}

# Write image data
foreach ($data in $imageData) {
    $iconWriter.Write($data)
}

# Clean up
$iconWriter.Close()
$iconStream.Close()

foreach ($bitmap in $bitmaps) {
    $bitmap.Dispose()
}

Write-Host "`nIcon created successfully at: $iconPath" -ForegroundColor Green
Write-Host "File size: $((Get-Item $iconPath).Length) bytes" -ForegroundColor Green
