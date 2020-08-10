export interface Shrine {
    startDate: string;
    endDate: string;
    week: number;
    perks: ShrinePerk[];
}

export interface ShrinePerk {
    id: string;
    bloodpointValue: number;
    cost: number;
    currency: string;
}