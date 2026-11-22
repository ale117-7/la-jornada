; Al desinstalar: se borra la entrada de «Iniciar con Windows» (si no, Windows intentaría
; abrir un programa que ya no existe) y el identificador para notificaciones.
; Al actualizar (el instalador nuevo ejecuta en silencio el desinstalador viejo) no se toca nada:
; la app sigue en el mismo sitio y el usuario conserva «Iniciar con Windows».
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.lajornada.app"
    DeleteRegKey HKCU "Software\Classes\AppUserModelId\com.lajornada.app"
  ${endIf}
!macroend
