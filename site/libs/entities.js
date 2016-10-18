module.exports = {
    device: {
        name: 'devices',
        props: {
            name: {
                type: 'text',
                notNull: true
            },
            host_page: {
                type: 'text',
                notNull: true
            },
            created: {
                type: 'integer',
                notNull: true
            },
            state: {
                type: 'text',
                notNull: true,
                default: 'alive'
            }
        }
    },
    property: {
        name: 'properties',
        props: {
            name: {
                type: 'text',
                notNull: true
            },
            propertyId: {
                type: 'text',
                notNull: true
            },
            maxValue: {
                type: 'real',
                notNull: true
            },
            minValue: {
                type: 'real',
                notNull: true
            },
            lackLink: {
                type: 'text',
                notNull: true
            },
            excessLink: {
                type: 'text',
                notNull: true
            },
            lackName: {
                type: 'text',
                notNull: true
            },
            excessName: {
                type: 'text',
                notNull: true
            },
            relId: {
                type: 'integer',
                notNull: true
            }
        }
    },
    message: {
        name: 'messages',
        props: {
            deviceId: {
                type: 'text',
                notNull: true
            },
            created: {
                type: 'integer',
                notNull: true
            },
            state: {
                type: 'text',
                notNull: true
            }
        }
    },
    report: {
        name: 'reports',
        props: {
            date: {
                type: 'integer',
                notNull: true
            },
            logLink: {
                type: 'text'
            }
        }
    },
    stat: {
        name: 'statsProperties',
        props: {
            name: {
                type: 'text',
                notNull: true
            },
            value: {
                type: 'real',
                notNull: true
            },
            propertyId: {
                type: 'text',
                notNull: true
            },
            deviceId: {
                type: 'text',
                notNull: true
            },
            deviceName: {
                type: 'text',
                notNull: true
            },
            actionType: {
                type: 'text',
                notNull: true
            },
            actionName: {
                type: 'text',
                notNull: true
            },
            time: {
                type: 'integer',
                notNull: true
            }
        }
    },
    user: {
        name: 'users',
        props: {
            username: {
                type: 'text',
                notNull: true
            },
            hashedPassword: {
                type: 'text',
                notNull: true
            },
            salt: {
                type: 'text',
                notNull: true
            },
            email: {
                type: 'text',
                notNull: true
            },
            phone:{
                type: 'text',
                notNull: true
            },
            countryCode: {
                type: 'text',
                notNull: true
            },
            newData: {
                type: 'text'
            },
            code: {
                type: 'text'
            }
        }
    }
};