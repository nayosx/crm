export interface LaundryClientInfo {
  nombre: string
  direccion: string
  pesoLbs: number
}

export interface LaundryGarmentCounts {
  ropaNegra: number | null
  ropaColor: number | null
  ropaRemojo: number | null
  ropaBlanca: number | null
  ropaToalla: number | null
  ropaJeans: number | null
  ropaRoja: number | null
  ropaUniformes: number | null
  ropaGabachas: number | null
}

export interface LaundryOthers {
  calcetinesPares: number | null
  calcetinesImpares: number | null
  sabanasUnidades: number | null
  zapatosPares: number | null
}

export interface LaundryIntake {
  cliente: LaundryClientInfo
  prendas: LaundryGarmentCounts
  otros: LaundryOthers
}