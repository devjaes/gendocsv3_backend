export enum DEFAULT_VARIABLE {
  FROM = '{{FROM}}',
  TO = '{{TO}}',

  /**
   * Variables utilizadas para reemplazar datos para CONSEJO
   */
  PREFIX_CONSEJO = 'consejo',
  FECHA = '{{FECHA}}',
  FECHAUP = '{{FECHAUP}}',
  SESION = '{{SESION}}',
  RESPONSABLE = '{{RESPONSABLE}}',

  /**
   * Variables utilizadas para reemplazar datos para información en GENERAL
   */
  PREFEX_GENERAL = 'general',
  CREADOPOR = '{{CREADOPOR}}',
  NUMDOC = '{{NUMDOC}}',

  /**
   * Variables utilizadas para reemplazar datos de DOCENTES en CONSEJOS
   */
  PREFIX_DOCENTES = 'docentes',
  DOCENTE_N = '{{DOCENTE_N_$i}}',
  DOCENTE_CARGO_N = '{{DOCENTE_CARGO_N_$i}}',

  /**
   * Variables utilizadas para reemplazar datos para de ESTUDIANTE
   */
  PREFIX_ESTUDIANTE = 'estudiante',
  ESTUDIANTE = '{{ESTUDIANTE}}',
  ESTUDIANTEUP = '{{ESTUDIANTEUP}}',
  CEDULA = '{{CEDULA}}',
  MATRICULA = '{{MATRICULA}}',
  FOLIO = '{{FOLIO}}',
  TELEFONO = '{{TELEFONO}}',
  CELULAR = '{{CELULAR}}',
  CORREO = '{{CORREO}}',
  CORREOUTA = '{{CORREOUTA}}',
  NOMBRECARRERA = '{{NOMBRECARRERA}}',
  NOMBRECARRERAUP = '{{NOMBRECARRERAUP}}',
  ESTUDIANTE_FECHA_NACIMIENTO = '{{ESTUDIANTE_FECHA_NACIMIENTO}}',
  ESTUDIANTE_TITULO = '{{ESTUDIANTE_TITULO}}',
  ESTUDIANTE_TITULO_UPPER = '{{ESTUDIANTE_TITULO_UPPER}}',
  ESTUDIANTE_TEMA = '{{ESTUDIANTE_TEMA}}',
  ESTUDIANTE_TITULO_BACHILLER = '{{ESTUDIANTE_TITULO_BACHILLER}}',
  ESTUDIANTE_FECHA_INICIO_ESTUDIOS_FECHAUP = '{{ESTUDIANTE_FECHA_INICIO_ESTUDIOS_FECHAUP}}',
  ESTUDIANTE_FECHA_FIN_ESTUDIOS_FECHAUP = '{{ESTUDIANTE_FECHA_FIN_ESTUDIOS_FECHAUP}}',
  COORDINADOR = '{{COORDINADOR}}',
  CANTON = '{{CANTON}}',
  PROVINCE = '{{PROVINCIA}}',

  /**
   * Variables utilizadas para generar la plantilla del acta
   */
  FECHA_U = '{{FECHA_U}}', // 16 DE JULIO DE 2021
  SESIONUP = '{{SESIONUP}}', // ORDINARIA
  SESION_L = '{{SESION_L}}', // ordinaria
  NUMACT = '{{NUMACT}}', // 001
  Y = '{{Y}}', // 2022
  YEAR = '{{YEAR}}', // 2022
  DIASEM_T = '{{DIASEM_T}}', // VIERNES
  NUMMES_T_U = '{{NUMMES_T_U}}', // JULIO
  MES_T_L = '{{MES_T_L}}', // julio
  NUMDIA_T = '{{NUMDIA_T}}', // VEINTICINCO
  NUMANIO_T = '{{NUMANIO_T}}', // DOS MIL VEINTIUNO
  NUMANIO_T_L = '{{NUMANIO_T_L}}', // dos mil veintiuno
  DIAS_T = '{{DIAS_T}}', // veinticinco días
  HORA_T_L = '{{HORA_T_L}}', // ocho
  MINUTOS_T_L = '{{MINUTOS_T_L}}', // treinta
  ASISTIERON = '{{ASISTIERON}}', // miembros que asistieron
  NO_ASISTIERON = '{{NO_ASISTIERON}}', // miembros que no asistieron

  /**
   * FECHAS
   */
  HORA_MINUTOS_TEXTO_L = '{{HORA_MINUTOS_TEXTO_L}}',

  /**
   * ACTA GRADO
   */
  ACTAGRADO_MIEMBROS_EC = '{{ACTAGRADO_MIEMBROS_EC}}',

  /**
   *
   */
  DECANA = '{{DECANA}}',
  PRESIDENTE_UNIDAD_IC = '{{PRESIDENTE_UNIDAD_IC}}',

  /**
   * PREFIJO DE VARIABLES CUSTOM
   */
  PREFIX_CUSTOM = 'custom',
  PREFIX_CARGOS = 'position',

  // eslint-disable-next-line no-template-curly-in-string
  SEPARATOR_NUMDOC = '${NUMDOC}',
  // eslint-disable-next-line no-template-curly-in-string
  SEPARATOR_YEAR = '${Y}',
}

// TODO: Add variables for DegreeCertificate
export enum DegreeCertificateVariables {}
