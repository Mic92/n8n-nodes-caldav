{
  description = "n8n CalDAV node with Radicale test server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{
      flake-parts,
      treefmt-nix,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        treefmt-nix.flakeModule
      ];
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];

      perSystem =
        {
          pkgs,
          config,
          ...
        }:
        {
          packages.default = pkgs.buildNpmPackage {
            pname = "n8n-nodes-caldav";
            version = "1.0.0";

            src = ./.;

            npmDepsHash = "sha256-wxr1/O0k4PRSHOuhmgoE3bJy4aiVf8FJl2uSxF2Gca8=";

            makeCacheWritable = true;
            npmFlags = [ "--ignore-scripts" ];

            buildPhase = ''
              runHook preBuild
              npm run build
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib/node_modules/n8n-nodes-caldav
              cp -r dist package.json node_modules $out/lib/node_modules/n8n-nodes-caldav/
              runHook postInstall
            '';

            meta = {
              description = "n8n node for CalDAV integration";
              license = pkgs.lib.licenses.mit;
            };
          };

          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs
              radicale
              apacheHttpd
            ];

            shellHook = ''
              echo "n8n CalDAV Node Development Environment"
              echo "Available: radicale, htpasswd, node, npm"
            '';
          };

          treefmt = {
            projectRootFile = "flake.nix";
            programs = {
              nixfmt.enable = true;
              prettier.enable = true;
            };
            settings.formatter = {
              prettier = {
                excludes = [
                  "package-lock.json"
                  "flake.lock"
                ];
              };
            };
          };

          checks = {
            package = config.packages.default;
            devShell = config.devShells.default;
          };
        };
    };
}
