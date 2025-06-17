export enum Permission { // TODO: Replace real bitfield values

    //* Misc

    Administrator = 1 << 0,
    CustomIcon = 1 << 0,
    ReportImmunity = 1 << 0,
    BypassValidation = 1 << 0,

    //* Staff overview

    ViewStaffCategories = 1 << 0,
    CreateStaffCategories = 1 << 0,
    EditStaffCategories = 1 << 0,
    DeleteStaffCategories = 1 << 0,
    ViewStaffMembers = 1 << 0,
    CreateStaffMembers = 1 << 0,
    EditStaffMembers = 1 << 0,
    DeleteStaffMembers = 1 << 0,

    //* Bans

    ViewBans = 1 << 0,
    CreateBans = 1 << 0,
    EditBans = 1 << 0,
    DeleteBans = 1 << 0,

    //* API Keys

    ViewApiKeys = 1 << 0,
    CreateApiKeys = 1 << 0,
    EditApiKeys = 1 << 0,
    DeleteApiKeys = 1 << 0,

    //* Connections

    ViewConnections = 1 << 0,
    RemoveConnections = 1 << 0,

    //* Gift codes

    ViewGiftCodes = 1 << 0,
    CreateGiftCodes = 1 << 0,
    EditGiftCodes = 1 << 0,
    DeleteGiftCodes = 1 << 0,

    //* Notes

    ViewNotes = 1 << 0,
    CreateNotes = 1 << 0,
    EditNotes = 1 << 0,
    DeleteNotes = 1 << 0,

    //* Roles

    ViewRoles = 1 << 0,
    CreateRoles = 1 << 0,
    EditRoles = 1 << 0,
    DeleteRoles = 1 << 0,
    ManagePlayerRoles = 1 << 0,

    //* Player management
    
    ViewTagHistory = 1 << 0,
    ManagePlayerTags = 1 << 0,
    ManagePlayerIcons = 1 << 0,
    ManagePlayerPositions = 1 << 0,
    ViewClears = 1 << 0,

    //* Referrals

    ViewReferrals = 1 << 0,
    RemoveReferrer = 1 << 0,

    //* Reports

    ViewReports = 1 << 0,
    ReviewReports = 1 << 0,
    DeleteReports = 1 << 0,

    //* Watchlist

    ViewWatchlist = 1 << 0,
    ManageWatchlistEntries = 1 << 0
}

export const permissions = Object.keys(Permission).filter(key => isNaN(Number(key))).map((permission) => Permission[permission as keyof typeof Permission]);