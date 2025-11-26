# Compress the file
Compress-Archive -Path "d:\Projetos\CRM\Nexus\crm-backend\index.js" -DestinationPath "d:\Projetos\CRM\Nexus\crm-backend\index.zip" -Force

# Convert to base64
$bytes = [System.IO.File]::ReadAllBytes("d:\Projetos\CRM\Nexus\crm-backend\index.zip")
$base64 = [System.Convert]::ToBase64String($bytes)

# Save to file
$base64 | Out-File "d:\Projetos\CRM\Nexus\crm-backend\index.b64" -Encoding ASCII

Write-Host "File compressed and encoded to base64"
Write-Host "File size: $($bytes.Length) bytes"
Write-Host "Base64 length: $($base64.Length) characters"
