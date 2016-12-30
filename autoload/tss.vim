let s:path = expand('<sfile>:p:h')
let s:server_id = 0
let s:startup_file = ''
let s:started = 0
let s:job_names = {}

function! tss#start()
	" Don't start the server if it's already running
	if s:server_id
		return
	endif

	let s:startup_file = expand('<afile>')
	if s:startup_file == ''
		let s:startup_file = expand('%')
	endif

	echom('Starting server for ' . s:startup_file)
	let s:server_id = jobstart(['node', s:path . '/../bin/start.js'], {
		\ 'on_stderr': function('s:StartupHandler'),
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:job_names[s:server_id] = 'Server start'
endfunction

function! tss#stop()
	" Don't try to stop the server if it's not running
	if !s:server_id 
		return 
	endif

	echom('Stopping server')
	let job = jobstart(['node', s:path . '/../bin/stop.js'], {
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:server_id = 0
	let s:job_names[job] = 'Server stop'
endfunction 

function! tss#openFile(file)
	call tss#debug('Opening ' . a:file)
	let job = jobstart(['node', s:path . '/../bin/open.js', a:file], {
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:job_names[job] = 'Opened ' . a:file
endfunction

function! tss#closeFile(file)
	call tss#debug('Closing ' . a:file)
	let job = jobstart(['node', s:path . '/../bin/close.js', a:file], {
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:job_names[job] = 'Closed ' . a:file
endfunction

function! tss#debug(message)
	if g:tss_verbose
		echom('TSS: ' . message)
	endif
endfunction

function! tss#error(message)
	if g:tss_verbose
		echoe('TSS: ' . message)
	endif
endfunction

function! s:ExitHandler(job_id, code)
	if a:code 
		call tss#error(s:job_names[a:job_id] . ' failed: ' . a:code)
	endif

	if a:job_id == s:server_id
		" If the server job died, clear the server ID field
		let s:server_id = 0
		let s:started = 0
	endif
endfunction

function! s:StartupHandler(job_id, data)
	if s:started 
		return 
	endif
	let data = join(a:data)
	if data =~ 'Listening on'
		let s:started = 1
		call tss#debug('Server started')

		" After the server starts, open the current file
		if s:startup_file != ''
			echom('Opening initial file ' . s:startup_file)
			call tss#openFile(s:startup_file)
		endif
	endif
endfunction
