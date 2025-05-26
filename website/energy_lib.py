#Librairie python pour la simulation de la consommation d'énergie 
def calculate_energy(data):
    total_energy = 0
    rates = {
        "SMS": 0.1,
        "YouTube": 0.45,
        "Web": 0.25,
        "Jeu casual": 0.4,
        "Jeu 3D": 0.6
    }
    for activity in data["activities"]:
        rate = rates.get(activity["type"], 0)
        total_energy += rate * activity["duration"]
    return round(total_energy, 2)
