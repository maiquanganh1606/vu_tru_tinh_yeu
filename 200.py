from flask import Flask, Response, render_template
from image_catalog import catalog_script

app = Flask(__name__, template_folder='200 days', static_folder='static')


@app.route('/')
def home():
    return render_template('200 days (frontend).html')


@app.route('/static/memories.js')
def memories():
    # Flask sees newly added photos immediately. Direct-file previews use
    # the snapshot refreshed by `python image_catalog.py`.
    return Response(catalog_script(), mimetype='application/javascript',
                    headers={'Cache-Control': 'no-cache'})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
