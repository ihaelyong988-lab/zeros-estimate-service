$action = New-ScheduledTaskAction -Execute 'C:\Program Files\Google\Chrome\Application\chrome.exe' -Argument 'http://localhost:3000'
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
Register-ScheduledTask -TaskName 'OpenChrome' -Action $action -Principal $principal
Start-ScheduledTask -TaskName 'OpenChrome'
Start-Sleep -Seconds 2
Unregister-ScheduledTask -TaskName 'OpenChrome' -Confirm:$false
