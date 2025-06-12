
export const vehicleBrands = [
  "Chevrolet",
  "Volkswagen",
  "Fiat",
  "Ford",
  "Toyota",
  "Honda",
  "Hyundai",
  "Nissan",
  "Renault",
  "Peugeot",
  "Citroën",
  "Jeep",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Mitsubishi",
  "Kia",
  "Suzuki",
  "Subaru",
  "Land Rover",
  "Volvo",
  "Chery",
  "JAC",
  "Caoa Chery",
  "GWM",
  "BYD"
];

export const vehicleModels = {
  "Chevrolet": [
    "Onix", "Prisma", "Cruze", "Tracker", "Equinox", "S10", "Spin", "Cobalt",
    "Sonic", "Agile", "Celta", "Classic", "Corsa", "Meriva", "Montana",
    "Astra", "Vectra", "Zafira", "Captiva", "Trailblazer"
  ],
  "Volkswagen": [
    "Gol", "Voyage", "Polo", "Virtus", "T-Cross", "Nivus", "Tiguan", "Amarok",
    "Fox", "CrossFox", "SpaceFox", "Golf", "Jetta", "Passat", "Touareg",
    "Up!", "Saveiro", "Kombi", "Parati", "Santana"
  ],
  "Fiat": [
    "Argo", "Cronos", "Mobi", "Uno", "Strada", "Toro", "Pulse", "Fastback",
    "Palio", "Siena", "Punto", "Linea", "Bravo", "Idea", "Doblò", "Fiorino",
    "Ducato", "500", "Panda", "Marea"
  ],
  "Ford": [
    "Ka", "Ka Sedan", "EcoSport", "Territory", "Ranger", "Edge", "Mustang",
    "Fiesta", "Focus", "Fusion", "Explorer", "F-150", "Transit", "Courier",
    "Escort", "Mondeo", "Maverick", "Belina"
  ],
  "Toyota": [
    "Corolla", "Yaris", "Etios", "RAV4", "Hilux", "SW4", "Prius", "Camry",
    "Fielder", "Bandeirante", "Land Cruiser", "Prado", "Avalon", "Highlander",
    "4Runner", "Tacoma", "Tundra", "Sienna"
  ],
  "Honda": [
    "City", "Civic", "Accord", "HR-V", "CR-V", "Pilot", "Fit", "WR-V",
    "Ridgeline", "Passport", "Odyssey", "Insight", "Clarity", "Element",
    "S2000", "NSX", "Del Sol", "Prelude"
  ]
};

export const vehicleYears = Array.from({ length: 25 }, (_, i) => (new Date().getFullYear() - i).toString());

export const vehicleColors = [
  "Branco",
  "Preto",
  "Prata",
  "Cinza",
  "Vermelho",
  "Azul",
  "Verde",
  "Amarelo",
  "Bege",
  "Marrom",
  "Rosa",
  "Laranja",
  "Roxo",
  "Dourado",
  "Bronze"
];

export const fuelTypes = [
  "Flex",
  "Gasolina",
  "Etanol",
  "Diesel",
  "Elétrico",
  "Híbrido",
  "GNV"
];

export function searchVehicleBrands(query: string): string[] {
  if (!query) return vehicleBrands;
  return vehicleBrands.filter(brand => 
    brand.toLowerCase().includes(query.toLowerCase())
  );
}

export function searchVehicleModels(brand: string, query: string): string[] {
  const models = vehicleModels[brand] || [];
  if (!query) return models;
  return models.filter(model => 
    model.toLowerCase().includes(query.toLowerCase())
  );
}
