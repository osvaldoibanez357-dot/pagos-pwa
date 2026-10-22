# Mis Pagos — PWA local

MVP sin servidor ni base de datos en la nube. Los movimientos se guardan en `localStorage` del navegador del dispositivo.

## Incluye
- Dashboard de saldo, ingresos y gastos del mes.
- Gráfica simple de ingresos vs gastos.
- Distribución de gasto por categoría.
- Registro manual de movimientos.
- Método de pago (incluye Apple Pay como etiqueta).
- Exportación e importación de respaldo JSON.
- Service worker para funcionamiento offline después de la primera carga.
- Manifest para instalación como PWA.

## Probar en Windows
1. Abre PowerShell en esta carpeta.
2. Ejecuta `python -m http.server 8080`.
3. Abre `http://localhost:8080` en el navegador.

## Instalar en iPhone sin pagar hosting
La forma más simple es publicar estos archivos en GitHub Pages (gratis). Así Safari los recibe por HTTPS y podrás usar **Compartir > Añadir a pantalla de inicio**.

> Importante: los datos financieros se guardan localmente en el navegador del iPhone. GitHub Pages solo hospeda los archivos de la app.
