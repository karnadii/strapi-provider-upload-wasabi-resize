'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const AWS = require('aws-sdk');

const trimParam = str => typeof str === "string" ? str.trim() : undefined;

module.exports = {
    provider: 'wasabi-resize',
    name: 'Wasabi upload and resize',
    auth: {
        public: {
            label: 'Access API Token',
            type: 'text'
        },
        private: {
            label: 'Secret Access Token',
            type: 'text'
        },
        region: {
            label: 'Region',
            type: 'enum',
            values: [
                'us-west-1',
                'us-east-1',
                'us-east-2',
                'eu-central-1',
            ]
        },
        bucket: {
            label: 'Bucket',
            type: 'text'
        },
        
    },
    init: (config) => {

        AWS.config.update({
            accessKeyId: trimParam(config.public),
            secretAccessKey: trimParam(config.private),
            region: config.region,
            endpoint: 's3.wasabisys.com'
        });

        const S3 = new AWS.S3({
            apiVersion: '2006-03-01',
            params: {
                Bucket: trimParam(config.bucket)
            }
        });

        return {
            upload: file => {
                return new Promise((resolve, reject) => {
                    // upload file on S3 bucket
                    const path = file.path ? `${file.path}/` : '';
                    S3.upload(
                        {
                            Key: `${path}${file.hash}${file.ext}`,
                            Body: new Buffer(file.buffer, 'binary'),
                            ACL: 'public-read',
                            ContentType: file.mime,
                        },
                        (err, data) => {
                            if (err) {
                                return reject(err);
                            }

                            // set the bucket file url
                            file.url = data.Location;

                            resolve();
                        }
                    );
                });
            },
            delete: (file) => {
                return new Promise((resolve, reject) => {

                    async function deleteImage(path, file, variant) {
                        return await S3.deleteObject({
                            Key: `${path}${file.hash}${file.ext}`
                        }).promise();
                    }

                    const path = file.path ? `${file.path}/` : '';

                    deleteImage(path, file, 'url')
                        .then(() => {
                            return resolve();
                        })
                        .catch(err => {
                            return reject(err);
                        });
                });
            }
        };
    }
};