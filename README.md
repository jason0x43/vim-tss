vim-tss
=======

TypeScript language services integration for Neovim

What it does
------------

This plugin provides a means for starting an instance of tsserver and
interacting with it in Vim. Individual TS commands such as 'format' or 'rename'
are implemented as standalone command line scripts. This allows Vim to make use
of the efficiency gains of tsserver without requiring complex Vim scripts.

Architecture
------------

The plugin consists of reasonably thin layer of Vim script that calls out to
several JavaScript scripts. All the support scripts are written in TypeScript
and compiled to JavaScript for execution. They include:

* `close` - Let tsserver know a file is no longer being edited.
* `completions` - Ask for possible completions at a given position and
  file.
* `errors` - List compile errors for a given file.
* `format` - List edits required to properly format a given file
* `open` - Let tsserver know a file is being edited.
* `start` - Starts an instance of tsserver and acts as a proxy for it, both
  on stdin and stdout, and on a bound TCP port.

Client scripts such as `open` and `errors` open connections to the running
server's port to communicate with it. They write a JSON request to the server
process's stdin, and wait for a JSON response on its stdout.

The specific port used by the server may be specified with a `-p` or `--port`
option. If not specified, the server fill locate an open port. Once a server
has been started, it will report the bound port number in an sh-compatible
environment variable assignment, like `VIM_TSS_PORT=12345`. If this environment
variable is set in a shell, all commands run in that shell will automatically
connect to that port. Otherwise, the port must be specified when each command
is called.

Installation
------------

*Note that the current version of this plugin only supports Neovim.*

Install the plugin however you like (vim-plug, Pathogen, etc.). After
installing the plugin, run `npm install` to build the support scripts.

Using vim-plug, the plugin line might look like:

```
Plug 'jason0x43/vim-tss', { 'for': [ 'typescript', 'javascript' ], 'do': 'npm install' }
```

The plugin will try to use `tsserver` from TypeScript in various locations in
the following order:

  * User-provided - tsserver script specified on the command line when
	running `start.js`
  * Global - from a globally installed TypeScript
  * Current project - from a project-local install of TypeScript
  * Plugin - from the plugin's own install of TypeScript

Usage
-----

See [the vimdoc](doc/vim-tss.txt)
