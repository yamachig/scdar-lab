module.exports = {
    basePath: process.env.GITHUB_ACTIONS ? "/scdar-lab" : "",
    trailingSlash: true,
    publicRuntimeConfig: {
        basePath: process.env.GITHUB_ACTIONS ? "/scdar-lab" : "",
    }
};
