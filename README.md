# BigQuery Release Notes Tracker 🚀

Una aplicación web moderna y dinámica construida con **Python Flask** en el backend y **HTML, CSS (Vanilla) y JavaScript puros** en el frontend. La aplicación obtiene, procesa y visualiza en tiempo real las notas de lanzamiento de Google Cloud BigQuery.

---

## 🌟 Características Principales

- **Monitoreo en Tiempo Real**: Consume directamente el feed XML de BigQuery de Google Cloud de forma asíncrona.
- **Categorización Inteligente**: Clasifica automáticamente cada cambio en badges de colores según su impacto (`FEATURE`, `FIX`, `CHANGED`, `DEPRECATED`, `BREAKING`, `GENERAL`).
- **Búsqueda y Filtros Reactivos**: Permite filtrar por tipo de cambio y buscar palabras clave en el título o contenido de las notas en tiempo real sin recargar la página.
- **Compartir en Twitter (X)**:
  - Botón individual por cada actualización para compartirla rápidamente.
  - Compositor con multi-selección de cambios individuales para armar un borrador de Tweet agrupado que valida automáticamente el límite de 280 caracteres.
- **Diseño Premium**: Interfaz oscura con temática **Glassmorphism**, animaciones fluidas, loaders con animación de esqueleto (Skeleton cards) y diseño totalmente responsivo.

---

## 📂 Estructura del Proyecto

```text
bq-releases-notes/
├── app.py                  # Servidor backend en Flask y parser XML/HTML
├── requirements.txt        # Dependencias de Python
├── .gitignore              # Archivos excluidos del control de versiones
├── templates/
│   └── index.html          # Interfaz de usuario semántica y SEO
└── static/
    ├── css/
    │   └── style.css       # Estilos del tema modo oscuro y animaciones CSS
    └── js/
        └── app.js          # Lógica interactiva del cliente (Estado, Búsqueda, Twitter)
```

---

## 🛠️ Requisitos Previos

- Python 3.8 o superior.
- Git instalado (opcional, para control de versiones).

---

## 🚀 Instalación y Uso Local

Sigue estos pasos para levantar el entorno de desarrollo local:

### 1. Clonar o descargar el repositorio
```bash
git clone https://github.com/stonedjjh/stonedjjh-event-talks-app.git
cd stonedjjh-event-talks-app
```

### 2. Crear e instalar el entorno virtual
En Windows (PowerShell/CMD):
```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

En macOS / Linux:
```bash
# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Iniciar el servidor
```bash
python app.py
```

El servidor local iniciará en:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🧪 Tecnologías Utilizadas

- **Servidor (Backend)**: [Flask](https://flask.palletsprojects.com/) (v3.0.3), [Requests](https://requests.readthedocs.io/) (v2.32.3), [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) (v4.12.3) para parsear el HTML interno del feed.
- **Diseño y Estructura**: HTML5 semántico y CSS3 puro.
- **Lógica e Interactividad (Frontend)**: JavaScript Vanilla (ES6+).
- **Consumo de datos**: Feed Atom XML oficial de BigQuery.
