# 🎵 QuatroLetras - Teleprompter de Letras, Setlists y Control de Energía para Músicos

**QuatroLetras** es una aplicación web progresiva (**PWA**) diseñada específicamente para músicos, bandas y solistas en escenario. Permite gestionar una biblioteca completa de canciones, estructurar setlists dinámicos organizados por **Tandas** y **Speeches**, analizar la **evolución de la energía** del show mediante gráficos interactivos y controlar el pase de letras en vivo mediante **pedales inalámbricos Page Turner de 2 botones** o gestos táctiles.

---

## 🚀 Características Principales

### 📚 1. Gestión de Biblioteca de Canciones
- **Catálogo Completo**: Creación, edición y eliminación de canciones con título, artista, duración estimada y letra formateada.
- **Escala de Energía (Grados 1 a 7)**: Asignación de niveles de energía desde Grado 1 (Muy baja) hasta Grado 7 (Clímax / Muy alta), con insignias visuales de mini-barras coloreadas.
- **Formato Enriquecido y Alineación de Letras**: Editor integrado con negrita, cursiva, subrayado, colores de texto personalizados y selector de alineación (Alineado a la Izquierda por defecto | Centrado opcional).
- **Audio de Acompañamiento / Pistas**: Adjunta archivos de audio (`.mp3`, `.wav`, etc.) a cualquier canción con almacenamiento local seguro en IndexedDB y reproductor integrado.
- **Filtros Avanzados y Búsqueda**: Filtrado instantáneo por texto (título/artista), artista específico, nivel de energía y ordenamiento alfabético o por intensidad.

---

### 🏷️ 2. Setlists con Tandas y Speeches
- **Múltiples Setlists**: Crea, renombra, elimina y conmuta entre distintos setlists para diferentes conciertos o giras.
- **🏷️ Tandas de Canciones**: Divide el setlist en bloques temáticos u organizativos.
  - **7 Temas de Color Transparente**: Colores automáticos (Azul, Violeta, Esmeralda, Ámbar, Rosa, Índigo y Turquesa) que tiñen uniformemente todas las canciones pertenecientes a esa Tanda.
  - **Conteo Automático**: Cálculo automático del número de canciones y duración acumulada total de cada Tanda.
- **🎙️ Speeches y Notas de Escenario**: Inserta momentos de alocución, presentaciones o notas de escenario entre las canciones sin necesidad de añadirlas a la biblioteca.
  - **Ubicación Flexible**:
    - **🏷️ En Tanda (`in-tanda`)**: Forma parte de la tanda actual, adopta su color y suma su duración al tiempo de la tanda.
    - **🎙️ Entre Tandas (`standalone`)**: Actúa como un intermedio independiente resaltado en tono violeta punteado.
- **Reordenamiento por Arrastre (Drag & Drop)**: Arrastra fácilmente tarjetas completas o mediante la manija `⠿`, totalmente optimizado para ratón en escritorio y gestos táctiles en tablets y móviles.

---

### 📊 3. Gráfico Interactivo de Estructura y Energía
- **Barra de Estructura Temporal**: Línea de tiempo visual proporcional que muestra la duración de cada bloque (`Tanda 1` -> `Speech` -> `Tanda 2` -> `Tanda 3`).
- **Curva Bézier de Energía (Escala 1 a 7)**: Gráfico SVG con degradados que representa la evolución de la intensidad del show a lo largo de todo el concierto.
- **Nodos Interactivos y Tooltips**: Al pasar el cursor o tocar un nodo, muestra título, artista, nivel de energía (`⚡ Grado N/7`), duración y tanda correspondiente.
- **Navegación al Clic**: Hacer clic en cualquier punto del gráfico o bloque de estructura desplaza suavemente la pantalla hasta esa canción en el setlist.
- **Colapsable**: Botón para expandir o plegar el panel del gráfico (`▲ Ocultar gráfico` / `▼ Mostrar gráfico`).

---

### 👁️ 4. Modo Vista Simple (Limpia)
- **Alternancia de 1 Clic (`👁️ Tandas & Speech`)**: Permite ocultar temporalmente los divisores de tanda, speeches, colores y el gráfico de energía para obtener un listado minimalista y continuo de canciones.
- **Persistencia**: La preferencia de vista seleccionada se guarda automáticamente en `localStorage`.

---

### 🎤 5. Modo Escenario (Visualizador de Letras en Vivo)
- **Pantalla Completa y Bloqueo de Suspensión (Wake Lock)**: Evita que la pantalla de la tablet o teléfono se apague durante el concierto.
- **Modos de Visualización**:
  - **Por Secciones (Paso a Paso)**: Avanza párrafos o estrofas con indicador de sección gigante (ej. `1 / 4`).
  - **Modo Continuo (Desplazamiento Suave)**: Scroll fluido de la letra completa con avance predeterminado de **400px** y ajuste en pasos de **50px** mediante la flechita hacia abajo (`▼`) situada bajo el icono de scroll (`📜`), mostrando el valor en píxeles justo debajo del icono.
- **Ajuste Dinámico de Tipografía**: Control directo de tamaño de fuente (`A+` / `A−`) activable desde el botón `A±` o su flechita hacia abajo (`▼`), desplegando el porcentaje del tamaño de letra justo debajo del icono.
- **Diapositiva para Speeches**: Interfaz oscura de alta legibilidad para discursos y notas de escenario.

---

### 🦶 6. Control por Pedal Page Turner (2 Botones Bluetooth)
- **Navegación 100% Manos Libres**: Mapeo personalizable para pedales Bluetooth (PageDown, PageUp, Flechas, Espacio, Enter).
- **Flujo Optimizado para 2 Botones**:
  - **Botón 1 (Atrás / Up)**: Abre el menú flotante del setlist (Picker) y navega hacia ARRIBA por las canciones.
  - **Botón 2 (Adelante / Down)**: En el visor, avanza secciones de la letra. En el menú flotante del setlist, navega hacia ABAJO por las canciones.
  - **Carga Directa de Letra**: Al navegar por el menú flotante, la canción resaltada se prepara directamente en su letra (`showingTitle = false`), de modo que al cerrar el menú estás listo para cantar sin saltos ni portadas intermedias.
- **Protección de Audio Activo**: Cuadro de confirmación si se intenta saltar de canción mientras un audio de acompañamiento se encuentra reproduciéndose.

---

### ⚙️ 7. Configuración, Exportación e Importación (JSON v3)
- **Respaldos Completos (JSON v3)**: Exporta e importa toda tu biblioteca, setlists, tandas, speeches, audios y configuraciones en un solo archivo.
- **Resolución Inteligente de Conflictos**: Al importar canciones con el mismo ID pero datos distintos (ej. duración o letra modificada), la app ofrece:
  1. Sobreescribir solo esa canción.
  2. Mantener la versión actual de la biblioteca.
  3. Sobreescribir todas las canciones en conflicto.

---

### 📱 8. Diseño Responsivo y Modo Offline (PWA)
- **Estación de Trabajo en Tablets y PC**: Diseño en 2 columnas paralelas (Setlist a la izquierda, Biblioteca a la derecha) en modo horizontal y tablets.
- **Diseño Adaptativo en Celulares**: Botones de acción organizados en una cuadrícula simétrica 2x2 en pantallas móviles verticales.
- **Funcionamiento 100% Offline**: Service Worker (`sw.js`) que almacena en caché todos los archivos de la aplicación para trabajar sin conexión a internet durante tus presentaciones.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 Semantic & CSS3 Vanilla**: Animaciones CSS, Glassmorphism, CSS Grid y Flexbox responsivo sin dependencias pesadas.
- **JavaScript Vanilla (ES6+)**: Lógica limpia modular sin frameworks externos.
- **SVG Dinámico**: Generación de curvas Bézier y gráficos de energía interactivos.
- **IndexedDB & LocalStorage**: Almacenamiento local persistente para canciones, audios binarios y configuraciones.
- **Service Worker API**: Soporte PWA offline para instalación en dispositivos iOS, Android, Windows y macOS.

---

## 📋 Estructura de Archivos

```
QuatroLetras/
├── index.html        # Estructura principal HTML5 y modales
├── styles.css        # Sistema de estilos, variables CSS y temas de color de Tandas
├── app.js            # Lógica completa de la app, estado, audio, gráfico SVG y pedal
├── sw.js             # Service Worker para almacenamiento en caché offline (PWA)
├── manifest.json     # Manifiesto de aplicación PWA
└── README.md         # Documentación del proyecto
```

---

## 📄 Licencia

Desarrollado para uso musical profesional en escenario. Libre para personalización y uso en presentaciones en vivo.
