from flask import Flask, render_template, request, jsonify
from energy_lib import calculate_energy  

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    # Expecting data like:
    # {
    #   "device": "smartphone-standard",
    #   "network": "5g",
    #   "is_mobile": true,
    #   "activities": [
    #       {"name": "netflix", "duration": 30},
    #       {"name": "appel", "duration": 10},
    #       ...
    #   ]
    # }
    energy = calculate_energy(data)
    return jsonify({
        'energy': energy
        #other stuff like separing battery consumption and module RF, etc.
        })

if __name__ == '__main__':
    app.run(debug=True)
