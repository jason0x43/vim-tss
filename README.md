vim-tss
=======

TypeScript language services integration for Vim

What it does
------------

This plugin provides a means for starting an instance of tsserver and interacting with it via command line scripts. This allows Vim to make use of the efficiency gains of tsserver without requiring complex Vim scripts. The only use case currently implemented is showing errors via Neomake.

Installation
------------

*Note that the current version of this plugin only supports Neovim.*

Install the plugin however you like (vim-plug, Pathogen, etc.). After installing the plugin, run `npm install` to build the support scripts.

The plugin will try to use `tsserver` from various locations in the following order:

  * User-provided 
  * Global
  * Current project
  * Plugin

Usage
-----

See [the vimdoc](doc/vim-tss.txt)

Architecture
------------

The plugin consists of a thin layer of Vim script that calls out to several JavaScript scripts. All the support scripts are written in TypeScript and compiled to JavaScript for execution. They include:

	* `start` - Starts an instance of tsserver and acts as a proxy for it, both on stdin and stdout, and on a bound file-based port.
	* `open` - Let tsserver know a file is being edited.
	* `close` - Let tsserver know a file is no longer being edited.
	* `errors` - List compile errors for a given file.
	* `format` - List edits required to properly format a given file

Client scripts such as `open` and `errors` open connections to the running server's port to communicate with it.

The specific port used by the server is based on the root directory of the current TypeScript project. Code in the `lib/connect` support script walks up the directory tree from the current directory, or the directory of a file passed to the client script, searching for a `tsconfig.json` file. The parent directory of the first such file is considered to be the project root. Once the root directory is found, it is resolved to an absolute path which is then MD5 hashed to obtain a hex string that uniquely identifies the server port. In this way, the server and client scripts can connect to each other based on the current project being edited without requiring the server port to be explicitly shared.
