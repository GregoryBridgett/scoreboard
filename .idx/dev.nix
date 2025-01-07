# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs ? import <nixpkgs> {} , ... }: {
  # devShell = pkgs.mkShell {
    # Which nixpkgs channel to use.
    channel = "stable-23.11"; # or "unstable"
    # Use https://search.nixos.org/packages to find packages
    packages = [
      pkgs.nodejs_20
      pkgs.python3
    ];
    # Sets environment variables in the workspace
    env = {
      PORT = "3000";
    };
    # This is a special attribute that configures IDX.
    # To learn more, see: https://developers.google.com/idx/guides/customize-idx-env
    idx = {
      # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
      extensions = [
        # "vscodevim.vim"
        "dbaeumer.vscode-eslint"
        "ms-vscode.js-debug"
      ];
      # Enable previews and customize configuration
      previews = {
        enable = true;
        previews = {
          web = {
           command = ["node" "server/server.mjs" "--port" "$PORT" "--bind" "0.0.0.0"];
          # command = ["python3" "-m" "http.server" "$PORT" "--bind" "0.0.0.0"];
            manager = "web";
          };

      };
    };
    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Example: install JS dependencies from NPM
        # npm-install = "npm install";
        # Open editors for the following files by default, if they exist:
        default.openFiles = [ "style.css" "main.js" "index.html" ];
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a background task to watch and re-build backend code
        # watch-backend = "npm start";
      };
    };
  };
}