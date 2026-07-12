# QuatroLetras

App web para mostrar letras de canciones a pantalla completa en tablet durante presentaciones en vivo.

# Resumen

- App web para mostrar letras de canciones en tablet, telefono o computador.
- **Biblioteca** almacena todas las letras de canciones ingresadas.
- **Setlist** almacena una selección personalizada de canciones.
- **Lista de Setlist** abre un desplegable con una lista de **Setlist** donde se selecciona la lista deseada.
- **Modo presentación** muestra la canción en pantalla. Incluye avance de letra en **Scroll** y **Párrafo**.
- **Scroll** muetra la letra de forma continua. Se puede controlar el avance mediante **Avance pixeles** el cual mide cuanto avanza la letra al pulsar de botón de avance.
- **Párrafp** muestra la letra en párrafos en pantalla. Al momento de ingresar la letra de la canción se debe separar cada párrafo mediante una **Línea vacía**.
- El sistema guarda el dato **Avance pixeles** para cada canción, asi como el **Tamaño de fuente** de cada párrafo por separado.
- **Exportar** permite guardar toda la **biblioteca**, los **Setlist** y sus listas.
- Permite ser controlado por un **Pedal Turner**. 
 
 
## Uso

1. Abre `index.html` en el navegador del tablet (Chrome o Safari).
2. Crea canciones en **Biblioteca** con **+ Nueva canción**.
3. Cada parrafo de la canción separado por una linea vacía se verá como párrafo separado en modo **Párrafo**.
4. Organiza el **Setlist** con el orden que quieras para la presentación (arrastra, ↑↓, o **+ Añadir canciones**).
5. Puedes agregar otra setlist con **+**, nombrar tu setlist con **✎** o eliminarla con **🗑**.  
6. Pulsa **▶** en una canción del setlist para mostrarla a pantalla completa.
7. En la parte superior del **Modo visualización** hay 4 botones: **Selector de modo** entre modo párrafo y continuo, **✎** el cual permite editar **Tamaño de fuente** y **Avance Pixeles**, **⛶** para pantalla completa y **✕** para cerrar.
8. Al comienzo de cada canción se muestra su número y nombre. Desde esta pantalla, al pulsar **Atras** para ver un listado rápido de canciones.

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
- **Lista de Setlist**: gestiona todas las setlist ingresadas.

Al crear una canción nueva se añade automáticamente al final del setlist en pantalla. Para quitar una canción del setlist sin borrarla de la biblioteca, usa el botón **−**. Para volver a añadirla, pulsa **+ Setlist** en la biblioteca o **+ Añadir canciones** en el setlist.

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
