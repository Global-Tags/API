export enum GlobalPosition {
    Above,
    Below,
    Right,
    Left
}

export const positions = Object.keys(GlobalPosition).filter(key => isNaN(Number(key))).map((icon) => GlobalPosition[icon as keyof typeof GlobalPosition]);