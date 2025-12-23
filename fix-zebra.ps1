$filePath = "d:\Dropbox\CURSOR\2025 12 COMENZI LBB\backend\src\services\pdf.service.ts"
$content = Get-Content $filePath -Raw

# Remove the zebraStripeColor line
$content = $content -replace "    const zebraStripeColor = '#e5e5e5' // medium grey for zebra striping - darker for better visibility while maintaining text contrast\r?\n", ""

# Replace the zebra stripe block with horizontal lines
$oldBlock = @"
      // Draw zebra stripe background for every other row \(even indices: 0, 2, 4, etc\.\)
      // Background is drawn at the same Y position as text to ensure proper vertical alignment
      // Only draw if no date highlight, to avoid overlapping
      if \(rowIndex % 2 === 0 && !dateHighlight\) \{
        doc\.save\(\)
        doc\.rect\(columnX, rowY, columnWidth, lineHeight\)
        doc\.fillAndStroke\(zebraStripeColor, zebraStripeColor\)
        doc\.restore\(\)
      \}
"@

$newBlock = @"
      // Draw horizontal grid lines on top and bottom of row
      doc.save()
      doc.strokeColor('#b3b3b3') // same grey as vertical lines for consistency
      doc.lineWidth(0.5)
      
      // Top line
      doc.moveTo(columnX, rowY)
      doc.lineTo(columnX + columnWidth, rowY)
      doc.stroke()
      
      // Bottom line
      doc.moveTo(columnX, rowY + lineHeight)
      doc.lineTo(columnX + columnWidth, rowY + lineHeight)
      doc.stroke()
      
      doc.restore()
"@

$content = $content -replace $oldBlock, $newBlock

# Also update the comment about zebra stripe
$content = $content -replace "// Draw date highlight if specified \(before zebra stripe to show underneath\)", "// Draw date highlight if specified (before horizontal lines to show underneath)"

$content | Set-Content $filePath -NoNewline
Write-Host "File updated successfully"

