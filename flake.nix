{
  description = "n8n CalDAV node with Radicale test server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs @ {
    flake-parts,
    ...
  }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = ["x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin"];

      perSystem = {
        pkgs,
        ...
      }: {
        packages.default = pkgs.buildNpmPackage {
          pname = "n8n-nodes-caldav";
          version = "1.0.0";

          src = ./.;

          npmDepsHash = "sha256-wxr1/O0k4PRSHOuhmgoE3bJy4aiVf8FJl2uSxF2Gca8=";

          makeCacheWritable = true;
          npmFlags = ["--ignore-scripts"];

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
            nodePackages.npm
            radicale
            apacheHttpd
          ];

          shellHook = ''
            echo "n8n CalDAV Node Development Environment"
            echo "Available: radicale, htpasswd, node, npm"
          '';
        };
      };
    };
}
