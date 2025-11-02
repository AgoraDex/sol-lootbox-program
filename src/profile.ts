let profile = process.env.PROFILE;

export const PROFILE_MAINNET = 'mainnet';
export const PROFILE_DEVNET = 'devnet';
export const PROFILE_DEVNET_OLD = 'devnet-old';
export const PROFILE_MAINNET_OLD = 'mainnet-old';

if (profile == undefined) {
    profile = PROFILE_DEVNET;
    console.info("Default profile is " + profile)
}

export const PROFILE = profile;