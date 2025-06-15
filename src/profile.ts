let profile = process.env.PROFILE;

export const PROFILE_MAINNET = 'mainnet';
export const PROFILE_DEVNET = 'devnet';

if (!profile) {
    profile = PROFILE_DEVNET;
    console.info("Default profile is " + profile)
}
else {
    if (profile.startsWith("d") || profile.startWith("D")) {
        profile = PROFILE_DEVNET;
    }
    else if (profile.startsWith("m") || profile.startWith("M")) {
        profile = PROFILE_MAINNET;
    }
    else {
        throw new Error("Profile name " + profile + " doesn't supported.");
    }
    console.info("Active profile is " + profile)
}

export const PROFILE = profile;