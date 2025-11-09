const { parserPreset, releaseRules } = require('./configs/commit-convention.cjs')

const SEMREL_PRESET = 'conventionalcommits'

module.exports = {
  branches: [
    {
      name: 'release/*',
      prerelease: false
    }
  ],
  tagFormat: 'v${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: SEMREL_PRESET,
        releaseRules,
        parserOpts: parserPreset.parserOpts
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: SEMREL_PRESET,
        parserOpts: parserPreset.parserOpts
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'node mcp-server/scripts/sync-unity-package-version.js ${nextRelease.version}'
      }
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
        pkgRoot: 'mcp-server'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: [
          'mcp-server/package.json',
          'pnpm-lock.yaml',
          'CHANGELOG.md',
          'UnityMCPServer/Packages/unity-mcp-server/package.json'
        ],
        message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}'
      }
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          {
            path: 'mcp-server/package.json',
            name: 'mcp-server-package.json',
            label: 'mcp-server package.json'
          },
          {
            path: 'UnityMCPServer/Packages/unity-mcp-server/package.json',
            name: 'unity-package.json',
            label: 'Unity Package package.json'
          },
          {
            path: 'CHANGELOG.md',
            label: 'CHANGELOG'
          }
        ]
      }
    ]
  ]
}
