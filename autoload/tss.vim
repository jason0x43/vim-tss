let s:path = expand('<sfile>:p:h')
let s:server_id = 0
let s:startup_file = ''
let s:started = 0
let s:job_names = {}

function! tss#closeFile(file)
	call tss#debug('Closing ' . a:file)
	let job = jobstart(['node', s:path . '/../bin/close.js', a:file], {
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:job_names[job] = 'Close ' . a:file
endfunction

function! tss#debug(message)
	if g:tss_verbose
		echom('TSS: ' . a:message)
	endif
endfunction

function! tss#error(message)
	if g:tss_verbose
		echoe('TSS: ' . a:message)
	endif
endfunction

function! tss#format()
	let file = expand('%')
	let tmpfile = tempname()

	call tss#debug('Saving to temp file ' . tmpfile)
	call execute('w ' . tmpfile)

	call tss#debug('Formatting ' . file)
	let lines = systemlist('node ' . shellescape(s:path . '/../bin/format.js') . ' ' . shellescape(file) . ' ' . shellescape(tmpfile))
	call s:Format(lines)

	call delete(tmpfile)
endfunction

function! tss#openFile(file)
	call tss#debug('Opening ' . a:file)
	let job = jobstart(['node', s:path . '/../bin/open.js', a:file], {
		\ 'on_stderr': function('s:LogHandler'),
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:job_names[job] = 'Open ' . a:file
endfunction

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
		\ 'on_stderr': function('s:StartHandler'),
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
		\ 'on_stderr': function('s:LogHandler'),
		\ 'on_exit': function('s:ExitHandler')
		\ })
	let s:server_id = 0
	let s:job_names[job] = 'Server stop'
endfunction 

function! s:ExitHandler(job_id, code)
	if a:code 
		call tss#error(s:job_names[a:job_id] . ' failed: ' . a:code)
	endif

	call tss#debug(s:job_names[a:job_id] . ' ended')

	if a:job_id == s:server_id
		" If the server job died, clear the server ID field
		let s:server_id = 0
		let s:started = 0
	endif
endfunction

function! s:Format(lines)
	if len(a:lines) == 0
		return
	endif

	" Save properties to restore later
	let view = winsaveview()
	let mark = split(execute('silent! marks k'))
	let tmp = getreg('m')
	let oldve = &ve

	" Allow selection to be one past EOL
	set ve+=onemore

	for line in a:lines
		if line == ''
			continue
		endif

		call tss#debug('Processing format line <<<' . line . '>>>')

		let parts = matchlist(line, '\([^(]\+\)(\(\d\+\),\(\d\+\)\.\.\(\d\+\),\(\d\+\)): \(.*\)')
		if len(parts) == 0
			continue 
		endif 

		let startLine = parts[2]
		let startOffset = parts[3]
		let endLine = parts[4]
		let endOffset = parts[5]

		call cursor(endLine, endOffset)
		:normal mk
		call cursor(startLine, startOffset)
		:normal d`k
		call tss#debug('Deleted text from (' . startLine . ',' . startOffset . ') to (' . endLine . ',' . endOffset . ')')

		call setreg('m', parts[6])
		let @m = parts[6]
		:normal "mP
		call tss#debug('Inserted "' . parts[6] . '" at (' . startLine . ',' . startOffset . ')')
	endfor

	"Restore the ve setting
	let &ve = oldve

	" Restore the 'm' register
	call setreg('m', tmp)

	" Restore the mark if it previously existed, or delete it
	if mark[0] == 'mark'
		call cursor(mark[5], mark[6])
		:normal mk
	else 
		:normal delmarks k
	endif

	" Restore the cursor position
	call winrestview(view)
endfunction 

function! s:LogHandler(job_id, data)
	call tss#debug('Log: ' . join(a:data))
endfunction 

function! s:StartHandler(job_id, data)
	call s:LogHandler(a:job_id, a:data)

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
