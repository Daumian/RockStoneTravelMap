# RockStoneTravelMap

Mapa interactivo de Mendoza para Rock Stone Travels (bodegas, restaurantes, museos, hoteles, alta montaña, etc.), con carrusel de experiencias premium.

## Generar la app Android offline (.apk)

La app se empaqueta con [Capacitor](https://capacitorjs.com/) para que corra 100% offline en tablets dedicadas, con el mapa (tiles de OpenStreetMap) incluido adentro del archivo.

1. En GitHub, ir a la pestaña **Actions** → workflow **"Build APK offline (Android)"** → **Run workflow**.
2. Esperar a que termine (la primera vez tarda más porque descarga ~77.000 tiles del mapa; las siguientes veces son más rápidas gracias a la cache).
3. Descargar el archivo `RockStoneTravels-app` (el `.apk`) desde los artifacts de esa ejecución.
4. Copiarlo por USB a cada tablet e instalarlo (Android va a pedir habilitar "instalar apps de orígenes desconocidos" la primera vez, es normal al no venir de Play Store).

Si cambia el logo, las fotos, `lugares.json` o el código, hay que volver a correr el workflow y redistribuir el `.apk` nuevo.

### Reemplazar el ícono placeholder

El ícono actual es provisorio. Para poner el logo real:

1. Reemplazar `assets-src/icon.png` (cuadrado, 1024x1024 o más) y `assets-src/splash.png`.
2. Correr `npx capacitor-assets generate --android --iconBackgroundColor '#1b2a4a' --iconBackgroundColorDark '#1b2a4a' --splashBackgroundColor '#1b2a4a' --splashBackgroundColorDark '#1b2a4a' --assetPath assets-src`.
3. Commitear los archivos generados en `android/app/src/main/res/`.
