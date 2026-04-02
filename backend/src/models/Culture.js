const mongoose = require('mongoose');

const cultureSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  parcelle: { type: String, default: null },
  nom: { type: String, required: true },
  variete: { type: String, required: true },
  type: { type: String, enum: ['agrume', 'cereale', 'legume', 'fruit'] },
  datePlantation: { type: Date, default: null },
  surface: { type: Number, default: null }, // en m²
  nombreArbres: { type: Number, default: null }, // nombre d'arbres (optionnel, utilisé pour calcul L/arbre)
  densite: Number, // arbres/ha
  stadeActuel: String,
  kcActuel: Number,
  irrigation: {
    type: { type: String, enum: ['goutte-a-goutte', 'aspersion', 'gravitaire'] },
    efficacite: { type: Number, default: 0.9 },
    debit: Number // L/h ou m³/h
  },
  besoinsEau: [{
    date: Date,
    et0: Number,
    kc: Number,
    etc: Number, // ETc = ET0 * Kc
    volume: Number, // en m³
    volumeParArbre: Number // en L
  }],
  historiqueIrrigation: [{
    date: Date,
    volume: Number,
    duree: Number, // en minutes
    mode: String,
    et0: Number,
    etc: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Culture', cultureSchema);