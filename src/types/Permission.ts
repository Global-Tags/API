export enum Permission {
    BypassValidation,
    CustomIcon,
    ManageBans,
    ManageApiKeys,
    ManageConnections,
    ManageGiftCodes,
    ManageNotes,
    ManageReports,
    ManageRoles,
    ManageTags,
    ManageWatchlist,
    ReportImmunity
}

export const permissions = Object.keys(Permission).filter(key => isNaN(Number(key))).map((permission) => Permission[permission as keyof typeof Permission]);