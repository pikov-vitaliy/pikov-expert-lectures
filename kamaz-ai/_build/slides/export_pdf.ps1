param([Parameter(Mandatory, ValueFromRemainingArguments)][string[]]$Pptx)
# PPTX -> PDF через PowerPoint. Закрывает только свои презентации; Quit – только если PowerPoint не был запущен до нас.
$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)
$pp = New-Object -ComObject PowerPoint.Application
try {
  foreach ($f in $Pptx) {
    $full = (Resolve-Path -LiteralPath $f).Path
    $pdf = [IO.Path]::ChangeExtension($full, '.pdf')
    $p = $pp.Presentations.Open($full, -1, 0, 0)   # ReadOnly, Untitled=false, WithWindow=false
    try { $p.SaveAs($pdf, 32) } finally { $p.Close() }
    Write-Output "pdf $pdf"
  }
} finally {
  # PowerPoint не закрываем: параллельные сборки делят один экземпляр
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($pp)
}
