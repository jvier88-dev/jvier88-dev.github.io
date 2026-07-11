# QuatroLetras

App web para mostrar letras de canciones a pantalla completa en tablet durante presentaciones en vivo.

## Uso

1. Abre `index.html` en el navegador del tablet (Chrome o Safari).
2. Crea canciones en **Biblioteca** con **+ Nueva canción**.
3. Organiza el **Setlist** con el orden que quieras para la presentación (arrastra, ↑↓, o **+ Añadir canciones**).
4. Pulsa **▶** en una canción del setlist para mostrarla a pantalla completa.
5. Toca la pantalla para ver los controles (tamaño de letra, pantalla completa, cerrar).
6. Si tienes varias canciones en el setlist, toca la letra para abrir el selector rápido.

## Controles en modo presentación

| Acción | Cómo |
|--------|------|
| Siguiente estrofa | Pedal avanzar (Page Down por defecto) |
| Estrofa anterior | Pedal retroceder (Page Up por defecto) |
| Siguiente canción | Pedal avanzar en la **última estrofa** |
| Elegir canción | Pedal retroceder en la **primera estrofa** → listado; usa los pedales para navegar |
| Cambiar canción (táctil) | Toca la letra para abrir el selector |
| Letra más grande/pequeña | Botones A+ / A− |
| Pantalla completa | Botón ⛶ o tecla `F` |
| Salir | Botón ✕ o `Esc` |

## Pedal turner (2 botones)

La app muestra **una estrofa a la vez** (separadas por líneas en blanco en la letra).

| Pedal | Comportamiento |
|-------|----------------|
| **Avanzar** | Siguiente estrofa → al final de la canción, pasa a la **siguiente canción** |
| **Retroceder** | Estrofa anterior → en la primera estrofa, abre el **listado** para elegir otra |

En el listado abierto:
- **Avanzar** = siguiente canción (la muestra al instante)
- **Retroceder** = canción anterior; en la primera, cierra el listado

Puedes reconfigurar las teclas del pedal en la pantalla principal (sección **Pedal turner**). La mayoría de pedales USB envían **Page Down** y **Page Up**; también funcionan las flechas del teclado.

## Instalar en tablet (opcional)

En Chrome/Safari: menú → **Añadir a pantalla de inicio**. La app funciona sin conexión una vez cargada.

## Datos

Las canciones se guardan en el navegador (localStorage). No se envían a ningún servidor.
Tamaño de fuente por estrofa: cada estrofa de cada canción guarda su propio tamaño. Al ajustar con A+/A− durante la presentación, se guarda solo para la estrofa visible. Al volver a esa canción, cada párrafo recupera el tamaño que le configuraste.

## Biblioteca y setlist

La app separa dos conceptos:

- **Biblioteca**: todas tus canciones. Créalas, edítalas o elimínalas aquí.
- **Setlist**: el orden de presentación en escenario. Puedes incluir solo las canciones que quieras y ordenarlas como prefieras.

Al crear una canción nueva se añade automáticamente al final del setlist. Para quitar una canción del setlist sin borrarla de la biblioteca, usa el botón **−**. Para volver a añadirla, pulsa **+ Setlist** en la biblioteca o **+ Añadir canciones** en el setlist.

El número en el setlist define:

- Cómo se muestran en el selector de presentación
- El avance con el **pedal** (siguiente canción = número siguiente)

Para reordenar el setlist: usa los botones **↑ ↓** o **arrastra** el ícono ⠿ en cada fila.

## Múltiples setlists
En la pantalla de gestión, encima de la lista de canciones hay un selector desplegable con:

- **Selector** — elige qué setlist ver y editar
- **+** — crea un setlist nuevo (nombre personalizable)
- **✎** — renombra el setlist activo
- **🗑** — elimina el setlist activo (siempre queda al menos uno)
Cada setlist guarda su propio orden de canciones. Al cambiar de setlist en el desplegable, la lista se actualiza al instante. Los datos existentes se migran automáticamente a un setlist llamado "Setlist 1".
