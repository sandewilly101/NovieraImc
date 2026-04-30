const PLAN_CONFIG = {
    free: {
        name: 'Free',
        storageLimit: 4 * 1024 * 1024 * 1024,
        durationDays: 30,
        price: 0
    },
    advanced: {
        name: 'Advanced',
        storageLimit: 20 * 1024 * 1024 * 1024,
        durationDays: 30,
        price: 80
    },
    premium: {
        name: 'Premium',
        storageLimit: 100 * 1024 * 1024 * 1024,
        durationDays: 30,
        price: 150
    }
};

module.exports = PLAN_CONFIG;
