import re
from datetime import datetime
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

# URL del feed de notas de lanzamiento de BigQuery
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_release_notes(xml_data):
    """
    Parsea el XML del feed Atom de notas de lanzamiento de Google Cloud.
    Extrae la lista de entradas con su fecha, título, y contenido estructurado.
    """
    try:
        # Registrar el namespace Atom por defecto
        # Atom feed usa xmlns="http://www.w3.org/2005/Atom"
        root = ET.fromstring(xml_data)
        
        # El namespace suele ser http://www.w3.org/2005/Atom
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry_node in root.findall('atom:entry', ns):
            # Obtener datos básicos
            title_node = entry_node.find('atom:title', ns)
            id_node = entry_node.find('atom:id', ns)
            updated_node = entry_node.find('atom:updated', ns)
            content_node = entry_node.find('atom:content', ns)
            
            title = title_node.text if title_node is not None else "Sin título"
            entry_id = id_node.text if id_node is not None else ""
            
            raw_date = updated_node.text if updated_node is not None else ""
            formatted_date = ""
            if raw_date:
                try:
                    # Ejemplo: 2026-06-15T12:00:00Z o similar
                    # Quitamos la Z o desfase para un parseo básico
                    clean_date = re.sub(r'Z|[+-]\d{2}:\d{2}$', '', raw_date)
                    dt = datetime.fromisoformat(clean_date)
                    formatted_date = dt.strftime("%B %d, %Y")
                except Exception:
                    formatted_date = raw_date
            
            content_html = content_node.text if content_node is not None else ""
            
            # Procesar el HTML del contenido para limpiarlo y categorizar los cambios
            changes = parse_changes_from_html(content_html)
            
            entries.append({
                "id": entry_id,
                "title": title,
                "date": formatted_date,
                "raw_date": raw_date,
                "content": content_html,
                "changes": changes
            })
            
        return entries
    except Exception as e:
        print(f"Error parseando XML: {e}")
        raise e

def parse_changes_from_html(html_content):
    """
    Parsea el HTML de la nota de lanzamiento para extraer los cambios específicos.
    Las notas de lanzamiento de Google Cloud suelen contener párrafos o listas
    con subtítulos como "Feature", "Changed", "Deprecated", etc.
    """
    if not html_content:
        return []
        
    soup = BeautifulSoup(html_content, 'html.parser')
    changes = []
    
    # Buscamos elementos h2, h3, p, o li que puedan indicar cambios individuales
    # Frecuentemente, el feed tiene una estructura de lista o secciones.
    # Vamos a extraer los elementos de lista (li) o bloques de texto
    # para mostrarlos de forma elegante.
    
    items = soup.find_all(['li', 'p'])
    for item in items:
        # Evitar procesar sub-elementos duplicados si ya procesamos el padre
        if item.name == 'p' and item.find('li'):
            continue
            
        text = item.get_text(strip=True)
        if not text:
            continue
            
        # Detectar el tipo de cambio (badge)
        change_type = "GENERAL"
        lower_text = text.lower()
        
        if "feature" in lower_text or "novedad" in lower_text or "nuevo" in lower_text:
            change_type = "FEATURE"
        elif "deprecated" in lower_text or "obsoleto" in lower_text or "deprecado" in lower_text:
            change_type = "DEPRECATED"
        elif "changed" in lower_text or "cambio" in lower_text or "modificado" in lower_text:
            change_type = "CHANGED"
        elif "bug" in lower_text or "fix" in lower_text or "corrección" in lower_text or "corregido" in lower_text:
            change_type = "FIX"
        elif "breaking" in lower_text:
            change_type = "BREAKING"
            
        # Generar HTML limpio para el elemento
        # Preservar enlaces y formato de código (code, strong, a)
        inner_html = ""
        for child in item.children:
            inner_html += str(child)
            
        changes.append({
            "type": change_type,
            "text": text,
            "html": inner_html.strip()
        })
        
    # Si no se encontraron listas o párrafos desglosados, agregamos el contenido completo como un cambio general
    if not changes:
        changes.append({
            "type": "GENERAL",
            "text": soup.get_text(strip=True),
            "html": str(soup)
        })
        
    return changes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Algunas veces el servidor responde con codificaciones extrañas, forzamos utf-8
        response.encoding = 'utf-8'
        
        releases = parse_release_notes(response.text)
        return jsonify({
            "success": True,
            "releases": releases
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
