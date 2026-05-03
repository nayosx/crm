export const getReduceName = (nombreCompleto: string): string => {
    if (!nombreCompleto || typeof nombreCompleto !== 'string') {
        return '';
    }

    const palabras = nombreCompleto.trim().split(/\s+/);

    if (palabras.length === 1) {
        return palabras[0][0].toUpperCase();
    }

    if (palabras.length === 2) {
        return (
            palabras[0][0].toUpperCase() +
            palabras[1][0].toUpperCase()
        );
    }

    if (palabras.length >= 3) {
        return (
            palabras[0][0].toUpperCase() +
            palabras[2][0].toUpperCase()
        );
    }

    return '';
}