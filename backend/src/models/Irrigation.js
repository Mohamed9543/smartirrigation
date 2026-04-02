const mongoose = require('mongoose');

const irrigationSchema = new mongoose.Schema({
  cultureId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Culture', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  mode: { 
    type: String, 
    enum: ['goutte-à-goutte', 'aspersion', 'gravitaire'], 
    required: true 
  },
  duree: { 
    type: Number, 
    required: true, 
    min: 0 
  }, // en minutes
  volume: { 
    type: Number, 
    required: true, 
    min: 0 
  }, // en litres
  debit: { 
    type: Number, 
    required: true 
  }, // L/h ou m³/h selon le mode
  et0: { 
    type: Number, 
    required: true 
  }, // ET₀ du jour en mm/j
  etc: { 
    type: Number, 
    required: true 
  }, // ETc calculé en mm/j
  kc: { 
    type: Number, 
    required: true 
  }, // Coefficient cultural utilisé
  surface: { 
    type: Number, 
    required: true 
  }, // Surface irriguée en m²
  efficacite: { 
    type: Number, 
    default: 0.9,
    min: 0,
    max: 1
  }, // Efficacité du système
  notes: { 
    type: String,
    maxLength: 500
  },
  completed: { 
    type: Boolean, 
    default: true 
  },
  meteo: {
    temperature: Number,
    humidity: Number,
    windSpeed: Number
  }
}, {
  timestamps: true
});

irrigationSchema.index({ cultureId: 1, date: -1 });
irrigationSchema.index({ date: -1 });

module.exports = mongoose.model('Irrigation', irrigationSchema);
