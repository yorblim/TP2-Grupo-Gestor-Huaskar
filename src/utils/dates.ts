import { AppError } from "./AppError";
export function dateRange(start?: string, end?: string) {
    const parse = (value: string, endOfDay: boolean) => {
        const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}-05:00` : value);
        if (Number.isNaN(date.getTime()))
            throw new AppError("Fecha inválida.", 400);
        return date;
    };
    const gte = start ? parse(start, false) : undefined;
    const lte = end ? parse(end, true) : undefined;
    if (gte && lte && gte > lte)
        throw new AppError("El inicio debe ser anterior al fin.", 400);
    return { ...(gte && { gte }), ...(lte && { lte }) };
}
export function peruDate(date: Date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
